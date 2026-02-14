import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { createHash } from "node:crypto";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const stableStringify = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort((left, right) =>
    left.localeCompare(right)
  );

  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
};

const buildContentHash = (input: {
  payload: unknown;
  editorState: unknown;
  backgroundImage: string | null;
  isDraft: boolean;
}) => {
  const normalized = stableStringify(input);
  return createHash("sha256").update(normalized).digest("hex");
};

const resolveAuthenticatedUserId = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  return session?.user?.id ?? null;
};

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();
    const payload = body?.payload;
    const editorState = body?.editorState ?? null;
    const backgroundImage =
      typeof body?.backgroundImage === "string" ? body.backgroundImage : null;
    const isDraft = Boolean(body?.isDraft ?? true);

    if (payload === undefined) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    const contentHash = buildContentHash({
      payload,
      editorState,
      backgroundImage,
      isDraft,
    });

    if (isDraft) {
      const draft = await prisma.fieldConfig.findFirst({
        where: { userId, isDraft: true },
        orderBy: { updatedAt: "desc" },
      });

      if (draft && draft.contentHash === contentHash) {
        return NextResponse.json(
          {
            id: draft.id,
            uploadId: draft.uploadId,
            contentHash: draft.contentHash,
            isDraft: draft.isDraft,
            createdAt: draft.createdAt,
            updatedAt: draft.updatedAt,
            deduped: true,
          },
          { status: 200 }
        );
      }

      if (draft) {
        const updated = await prisma.fieldConfig.update({
          where: { id: draft.id },
          data: {
            payload,
            backgroundImage,
            contentHash,
            isDraft: true,
          },
        });

        return NextResponse.json(
          {
            id: updated.id,
            uploadId: updated.uploadId,
            contentHash: updated.contentHash,
            isDraft: updated.isDraft,
            createdAt: updated.createdAt,
            updatedAt: updated.updatedAt,
            deduped: false,
          },
          { status: 200 }
        );
      }

      const createdDraft = await prisma.fieldConfig.create({
        data: {
          userId,
          payload,
          backgroundImage,
          contentHash,
          isDraft: true,
        },
      });

      return NextResponse.json(
        {
          id: createdDraft.id,
          uploadId: createdDraft.uploadId,
          contentHash: createdDraft.contentHash,
          isDraft: createdDraft.isDraft,
          createdAt: createdDraft.createdAt,
          updatedAt: createdDraft.updatedAt,
          deduped: false,
        },
        { status: 201 }
      );
    }

    const created = await prisma.fieldConfig.create({
      data: {
        userId,
        payload,
        backgroundImage,
        contentHash,
        isDraft: false,
      },
    });

    return NextResponse.json(
      {
        id: created.id,
        uploadId: created.uploadId,
        contentHash: created.contentHash,
        isDraft: created.isDraft,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt,
        deduped: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("/api/field-configs POST failed", error);
    const message =
      error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const latestDraft = await prisma.fieldConfig.findFirst({
      where: { userId, isDraft: true },
      orderBy: { updatedAt: "desc" },
    });

    const latestFinal = await prisma.fieldConfig.findFirst({
      where: { userId, isDraft: false },
      orderBy: { updatedAt: "desc" },
    });

    const latest = latestDraft ?? latestFinal;

    if (!latest) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        config: {
          id: latest.id,
          uploadId: latest.uploadId,
          userId: latest.userId,
          payload: latest.payload,
          backgroundImage: latest.backgroundImage,
          contentHash: latest.contentHash,
          isDraft: latest.isDraft,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/field-configs GET failed", error);
    const message =
      error instanceof Error ? error.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
