import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { sql } from "kysely";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ProjectStatus = "active" | "archive" | "trash";

type RouteContext = {
  params: Promise<{ uploadId: string }>;
};

type ProjectMetadataRow = {
  upload_id: string;
  name: string;
  status: ProjectStatus;
  updated_at: Date;
  content_hash: string;
  is_draft: boolean;
};

const resolveAuthenticatedUserId = async () => {
  const headersList = await headers();
  const session = await auth.api.getSession({ headers: headersList });
  return session?.user?.id ?? null;
};

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

const normalizeStatus = (value: unknown): ProjectStatus | null => {
  if (value === "active" || value === "archive" || value === "trash") {
    return value;
  }
  return null;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProjectsTable();

    const { uploadId } = await context.params;
    const normalizedUploadId = uploadId?.trim();
    if (!normalizedUploadId) {
      return NextResponse.json({ error: "Invalid upload id." }, { status: 400 });
    }

    await sql`
      insert into public.project_manager_entries (upload_id, user_id, name, status)
      select
        f.upload_id,
        f.user_id,
        concat('Project ', right(f.content_hash, 4)),
        'active'
      from public.field_configs f
      where f.upload_id = ${normalizedUploadId}::uuid
        and f.user_id = ${userId}
      on conflict (upload_id) do nothing
    `.execute(db);

    const result = await sql<ProjectMetadataRow>`
      select
        p.upload_id,
        p.name,
        p.status,
        p.updated_at,
        f.content_hash::text as content_hash,
        f.is_draft
      from public.project_manager_entries p
      join public.field_configs f on f.upload_id = p.upload_id
      where p.upload_id = ${normalizedUploadId}::uuid
        and p.user_id = ${userId}
        and f.user_id = ${userId}
      limit 1
    `.execute(db);

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        project: {
          uploadId: row.upload_id,
          name: row.name,
          status: row.status,
          updatedAt: row.updated_at,
          contentHash: row.content_hash,
          isDraft: row.is_draft,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/projects/[uploadId] GET failed", error);
    const message = error instanceof Error ? error.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProjectsTable();

    const { uploadId } = await context.params;
    const normalizedUploadId = uploadId?.trim();
    if (!normalizedUploadId) {
      return NextResponse.json({ error: "Invalid upload id." }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      status?: string;
    };

    const nextStatus = normalizeStatus(body.status);
    const nextName =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : null;

    if (!nextStatus && !nextName) {
      return NextResponse.json({ error: "No valid updates provided." }, { status: 400 });
    }

    await sql`
      insert into public.project_manager_entries (upload_id, user_id, name, status)
      select
        f.upload_id,
        f.user_id,
        concat('Project ', right(f.content_hash, 4)),
        'active'
      from public.field_configs f
      where f.upload_id = ${normalizedUploadId}::uuid
        and f.user_id = ${userId}
      on conflict (upload_id) do nothing
    `.execute(db);

    const result = await sql<{
      upload_id: string;
      name: string;
      status: string;
      updated_at: Date;
    }>`
      update public.project_manager_entries p
      set
        name = coalesce(${nextName}, p.name),
        status = coalesce(${nextStatus}, p.status),
        updated_at = now()
      from public.field_configs f
      where p.upload_id = ${normalizedUploadId}::uuid
        and f.upload_id = p.upload_id
        and p.user_id = ${userId}
        and f.user_id = ${userId}
      returning p.upload_id, p.name, p.status, p.updated_at
    `.execute(db);

    const row = result.rows[0];
    if (!row) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json(
      {
        project: {
          uploadId: row.upload_id,
          name: row.name,
          status: row.status,
          updatedAt: row.updated_at,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("/api/projects/[uploadId] PATCH failed", error);
    const message = error instanceof Error ? error.message : "Update failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProjectsTable();

    const { uploadId } = await context.params;
    const normalizedUploadId = uploadId?.trim();
    if (!normalizedUploadId) {
      return NextResponse.json({ error: "Invalid upload id." }, { status: 400 });
    }

    const result = await sql<{ upload_id: string }>`
      delete from public.field_configs f
      where f.upload_id = ${normalizedUploadId}::uuid
        and f.user_id = ${userId}
      returning f.upload_id
    `.execute(db);

    if (!result.rows[0]) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("/api/projects/[uploadId] DELETE failed", error);
    const message = error instanceof Error ? error.message : "Delete failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
