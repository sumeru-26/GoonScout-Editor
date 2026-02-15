import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ uploadId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { uploadId } = await context.params;
    const normalizedUploadId = uploadId?.trim();

    if (!normalizedUploadId) {
      return NextResponse.json({ error: "Invalid upload id." }, { status: 400 });
    }

    const config = await prisma.fieldConfig.findUnique({
      where: { uploadId: normalizedUploadId },
      select: {
        uploadId: true,
        backgroundImage: true,
        updatedAt: true,
      },
    });

    if (!config) {
      return NextResponse.json({ error: "Config not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        uploadId: config.uploadId,
        backgroundImage: config.backgroundImage,
        updatedAt: config.updatedAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(
      "/api/field-configs/public/[uploadId]/background-image GET failed",
      error
    );
    const message = error instanceof Error ? error.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
