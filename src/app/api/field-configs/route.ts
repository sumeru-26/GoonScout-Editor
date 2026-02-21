import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "kysely";

type FieldConfigRow = {
  id: string;
  upload_id: string;
  user_id: string;
  payload: unknown;
  background_image: string | null;
  content_hash: string;
  is_draft: boolean;
  created_at: Date;
  updated_at: Date;
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

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

const buildDraftFingerprint = (input: {
  payload: unknown;
  editorState: unknown;
  backgroundImage: string | null;
  isDraft: boolean;
}) => stableStringify(input);

const buildShareCode8 = () =>
  `${Math.floor(Math.random() * 90_000_000) + 10_000_000}`;

const ensureProjectsTable = async () => {
  await sql`
    create table if not exists public.project_manager_entries (
      upload_id uuid primary key references public.field_configs(upload_id) on delete cascade,
      user_id text not null,
      name text not null,
      status varchar(16) not null default 'active',
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint project_manager_entries_status_chk check (status in ('active', 'archive', 'trash'))
    )
  `.execute(db);

  await sql`
    create index if not exists project_manager_entries_user_status_updated_idx
      on public.project_manager_entries (user_id, status, updated_at desc)
  `.execute(db);

  await sql`
    alter table public.project_manager_entries
    drop constraint if exists project_manager_entries_user_id_key
  `.execute(db);

  await sql`
    drop index if exists public.project_manager_entries_user_id_key
  `.execute(db);
};

const ensureMultipleDraftsAllowed = async () => {
  await sql`
    alter table public.field_configs
    drop constraint if exists field_configs_one_draft_per_user_uidx
  `.execute(db);

  await sql`
    drop index if exists public.field_configs_one_draft_per_user_uidx
  `.execute(db);
};

const upsertProjectEntry = async (input: {
  uploadId: string;
  userId: string;
  contentHash: string;
}) => {
  await ensureProjectsTable();

  await sql`
    insert into public.project_manager_entries (upload_id, user_id, name, status)
    values (
      ${input.uploadId}::uuid,
      ${input.userId},
      concat('Project ', right(${input.contentHash}, 4)),
      'active'
    )
    on conflict (upload_id) do update
    set
      user_id = excluded.user_id,
      status = 'active',
      updated_at = now()
  `.execute(db);
};

const selectLatestByUserAndDraft = async (input: {
  userId: string;
  isDraft: boolean;
}) => {
  const result = await sql<FieldConfigRow>`
    select
      id,
      upload_id,
      user_id,
      payload,
      background_image,
      content_hash,
      is_draft,
      created_at,
      updated_at
    from public.field_configs
    where user_id = ${input.userId}
      and is_draft = ${input.isDraft}
    order by updated_at desc
    limit 1
  `.execute(db);

  return result.rows[0] ?? null;
};

const updateFieldConfigDraft = async (input: {
  id: string;
  payload: unknown;
  backgroundImage: string | null;
}) => {
  const payloadJson = JSON.stringify(input.payload);

  const result = await sql<FieldConfigRow>`
    update public.field_configs
    set
      payload = ${payloadJson}::jsonb,
      background_image = ${input.backgroundImage},
      is_draft = true,
      updated_at = now()
    where id = ${input.id}::uuid
    returning
      id,
      upload_id,
      user_id,
      payload,
      background_image,
      content_hash,
      is_draft,
      created_at,
      updated_at
  `.execute(db);

  return result.rows[0] ?? null;
};

const updateFieldConfigByUploadId = async (input: {
  userId: string;
  uploadId: string;
  payload: unknown;
  backgroundImage: string | null;
  isDraft: boolean;
}) => {
  const payloadJson = JSON.stringify(input.payload);

  const result = await sql<FieldConfigRow>`
    update public.field_configs
    set
      payload = ${payloadJson}::jsonb,
      background_image = ${input.backgroundImage},
      is_draft = ${input.isDraft},
      updated_at = now()
    where upload_id = ${input.uploadId}::uuid
      and user_id = ${input.userId}
    returning
      id,
      upload_id,
      user_id,
      payload,
      background_image,
      content_hash,
      is_draft,
      created_at,
      updated_at
  `.execute(db);

  return result.rows[0] ?? null;
};

const cleanupOtherDrafts = async (input: { userId: string; keepId: string }) => {
  await sql`
    delete from public.field_configs
    where user_id = ${input.userId}
      and is_draft = true
      and id <> ${input.keepId}::uuid
  `.execute(db);
};

const createFieldConfigWithRetry = async (input: {
  userId: string;
  payload: unknown;
  backgroundImage: string | null;
  isDraft: boolean;
}) => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const payloadJson = JSON.stringify(input.payload);
      const result = await sql<FieldConfigRow>`
        insert into public.field_configs (
          id,
          upload_id,
          user_id,
          payload,
          background_image,
          content_hash,
          is_draft
        )
        values (
          ${randomUUID()}::uuid,
          ${randomUUID()}::uuid,
          ${input.userId},
          ${payloadJson}::jsonb,
          ${input.backgroundImage},
          ${buildShareCode8()},
          ${input.isDraft}
        )
        returning
          id,
          upload_id,
          user_id,
          payload,
          background_image,
          content_hash,
          is_draft,
          created_at,
          updated_at
      `.execute(db);

      const created = result.rows[0];
      if (!created) {
        throw new Error("Failed to create field config.");
      }

      return created;
    } catch (error) {
      const pgCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : null;

      const isUniqueConflict = pgCode === "23505";

      if (!isUniqueConflict || attempt === maxAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Unable to generate a unique share code.");
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

    await ensureMultipleDraftsAllowed();

    const body = await request.json();
    const payload = body?.payload;
    const editorState = body?.editorState ?? null;
    const backgroundImage =
      typeof body?.backgroundImage === "string" ? body.backgroundImage : null;
    const requestedUploadId =
      typeof body?.uploadId === "string" ? body.uploadId.trim() : "";
    const isDraft = Boolean(body?.isDraft ?? true);

    if (payload === undefined) {
      return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
    }

    if (requestedUploadId) {
      const scoped = await updateFieldConfigByUploadId({
        userId,
        uploadId: requestedUploadId,
        payload,
        backgroundImage,
        isDraft,
      });

      if (!scoped) {
        return NextResponse.json({ error: "Project config not found." }, { status: 404 });
      }

      if (!isDraft) {
        await upsertProjectEntry({
          uploadId: scoped.upload_id,
          userId: scoped.user_id,
          contentHash: scoped.content_hash,
        });
      }

      return NextResponse.json(
        {
          id: scoped.id,
          uploadId: scoped.upload_id,
          contentHash: scoped.content_hash,
          isDraft: scoped.is_draft,
          createdAt: scoped.created_at,
          updatedAt: scoped.updated_at,
          deduped: false,
        },
        { status: 200 }
      );
    }

    if (isDraft) {
      const incomingDraftFingerprint = buildDraftFingerprint({
        payload,
        editorState,
        backgroundImage,
        isDraft: true,
      });

      const draft = await selectLatestByUserAndDraft({ userId, isDraft: true });

      if (draft) {
        const draftPayloadRecord = isObjectRecord(draft.payload)
          ? draft.payload
          : null;
        const existingEditorState = draftPayloadRecord?.editorState ?? draft.payload;
        const existingDraftFingerprint = buildDraftFingerprint({
          payload: draft.payload,
          editorState: existingEditorState,
          backgroundImage: draft.background_image,
          isDraft: draft.is_draft,
        });

        if (existingDraftFingerprint === incomingDraftFingerprint) {
          await cleanupOtherDrafts({ userId, keepId: draft.id });
          return NextResponse.json(
            {
              id: draft.id,
              uploadId: draft.upload_id,
              contentHash: draft.content_hash,
              isDraft: draft.is_draft,
              createdAt: draft.created_at,
              updatedAt: draft.updated_at,
              deduped: true,
            },
            { status: 200 }
          );
        }
      }

      if (draft) {
        const updated = await updateFieldConfigDraft({
          id: draft.id,
          payload,
          backgroundImage,
        });

        if (!updated) {
          throw new Error("Draft update failed.");
        }

        await cleanupOtherDrafts({ userId, keepId: updated.id });

        return NextResponse.json(
          {
            id: updated.id,
            uploadId: updated.upload_id,
            contentHash: updated.content_hash,
            isDraft: updated.is_draft,
            createdAt: updated.created_at,
            updatedAt: updated.updated_at,
            deduped: false,
          },
          { status: 200 }
        );
      }

      const createdDraft = await createFieldConfigWithRetry({
        userId,
        payload,
        backgroundImage,
        isDraft: true,
      });

      await cleanupOtherDrafts({ userId, keepId: createdDraft.id });

      return NextResponse.json(
        {
          id: createdDraft.id,
          uploadId: createdDraft.upload_id,
          contentHash: createdDraft.content_hash,
          isDraft: createdDraft.is_draft,
          createdAt: createdDraft.created_at,
          updatedAt: createdDraft.updated_at,
          deduped: false,
        },
        { status: 201 }
      );
    }

    const created = await createFieldConfigWithRetry({
      userId,
      payload,
      backgroundImage,
      isDraft: false,
    });

    await upsertProjectEntry({
      uploadId: created.upload_id,
      userId: created.user_id,
      contentHash: created.content_hash,
    });

    return NextResponse.json(
      {
        id: created.id,
        uploadId: created.upload_id,
        contentHash: created.content_hash,
        isDraft: created.is_draft,
        createdAt: created.created_at,
        updatedAt: created.updated_at,
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

    const latestDraft = await selectLatestByUserAndDraft({ userId, isDraft: true });
    const latestFinal = await selectLatestByUserAndDraft({ userId, isDraft: false });

    const latest = latestDraft ?? latestFinal;

    if (!latest) {
      return NextResponse.json({ config: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        config: {
          id: latest.id,
          uploadId: latest.upload_id,
          userId: latest.user_id,
          payload: latest.payload,
          backgroundImage: latest.background_image,
          contentHash: latest.content_hash,
          isDraft: latest.is_draft,
          createdAt: latest.created_at,
          updatedAt: latest.updated_at,
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
