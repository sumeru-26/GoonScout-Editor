import { NextResponse } from "next/server";
import { sql } from "kysely";

import { db } from "@/lib/db";

type PublicFieldConfigByHashRow = {
  upload_id: string;
  payload: unknown;
  background_image: string | null;
  updated_at: Date;
  content_hash: string;
};

type RouteContext = {
  params: Promise<{ contentHash: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const { contentHash } = await context.params;
    const normalizedHash = contentHash?.trim();

    if (!normalizedHash) {
      return NextResponse.json({ error: "Invalid content hash." }, { status: 400 });
    }

    const result = await sql<PublicFieldConfigByHashRow>`
      select
        upload_id,
        payload,
        background_image,
        updated_at,
        content_hash
      from public.field_configs
      where content_hash = ${normalizedHash}
        and is_public = true
      order by updated_at desc
      limit 1
    `.execute(db);

    const config = result.rows[0] ?? null;

    if (!config) {
      return NextResponse.json({ error: "Public config not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        config: {
          uploadId: config.upload_id,
          contentHash: config.content_hash,
          payload: config.payload,
          backgroundImage: config.background_image,
          updatedAt: config.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/field-configs/public/hash/[contentHash] GET failed", error);
    const message = error instanceof Error ? error.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
