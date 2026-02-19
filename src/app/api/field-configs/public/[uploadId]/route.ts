import { NextResponse } from "next/server";
import { sql } from "kysely";

import { db } from "@/lib/db";

type PublicFieldConfigRow = {
  upload_id: string;
  payload: unknown;
  background_image: string | null;
  updated_at: Date;
};

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

    const result = await sql<PublicFieldConfigRow>`
      select
        upload_id,
        payload,
        background_image,
        updated_at
      from public.field_configs
      where upload_id = ${normalizedUploadId}::uuid
      limit 1
    `.execute(db);

    const config = result.rows[0] ?? null;

    if (!config) {
      return NextResponse.json({ error: "Config not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        config: {
          uploadId: config.upload_id,
          payload: config.payload,
          backgroundImage: config.background_image,
          updatedAt: config.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/field-configs/public/[uploadId] GET failed", error);
    const message = error instanceof Error ? error.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
