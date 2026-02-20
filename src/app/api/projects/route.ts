import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { randomUUID } from "node:crypto";
import { sql } from "kysely";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

type ProjectStatus = "active" | "archive" | "trash";

type ProjectRow = {
  upload_id: string;
  name: string;
  status: ProjectStatus;
  updated_at: Date;
  config_updated_at: Date;
  payload: unknown;
  background_image: string | null;
};

const buildShareCode8 = () =>
  `${Math.floor(Math.random() * 90_000_000) + 10_000_000}`;

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
};

const ensureProjectEntriesForUser = async (userId: string) => {
  await sql`
    insert into public.project_manager_entries (upload_id, user_id, name, status)
    select
      f.upload_id,
      f.user_id,
      concat('Project ', right(f.content_hash, 4)),
      'active'
    from public.field_configs f
    where f.user_id = ${userId}
      and f.is_draft = false
      and not exists (
        select 1
        from public.project_manager_entries p
        where p.upload_id = f.upload_id
      )
  `.execute(db);
};

const inferStageCount = (payload: unknown) => {
  if (!Array.isArray(payload)) return 1;

  const stageParentTags = new Set<string>();
  for (const entry of payload) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const element =
      (record.button as Record<string, unknown> | undefined) ??
      (record["icon-button"] as Record<string, unknown> | undefined) ??
      (record["text-input"] as Record<string, unknown> | undefined) ??
      (record["toggle-switch"] as Record<string, unknown> | undefined);

    if (!element) continue;
    const stageParentTag =
      typeof element.stageParentTag === "string"
        ? element.stageParentTag.trim()
        : "";
    if (stageParentTag) {
      stageParentTags.add(stageParentTag);
    }
  }

  return Math.max(1, stageParentTags.size + 1);
};

export async function GET(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProjectsTable();
    await ensureProjectEntriesForUser(userId);

    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status")?.trim().toLowerCase();
    const status: ProjectStatus =
      rawStatus === "archive" || rawStatus === "trash" ? rawStatus : "active";

    const result = await sql<ProjectRow>`
      select
        p.upload_id,
        p.name,
        p.status,
        p.updated_at,
        f.updated_at as config_updated_at,
        f.payload,
        f.background_image
      from public.project_manager_entries p
      join public.field_configs f on f.upload_id = p.upload_id
      where p.user_id = ${userId}
        and f.user_id = ${userId}
        and f.is_draft = false
        and p.status = ${status}
      order by p.updated_at desc
    `.execute(db);

    const projects = result.rows.map((row) => ({
      uploadId: row.upload_id,
      name: row.name,
      status: row.status,
      updatedAt: row.updated_at,
      configUpdatedAt: row.config_updated_at,
      stageCount: inferStageCount(row.payload),
      backgroundImage: row.background_image,
    }));

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    console.error("/api/projects GET failed", error);
    const message = error instanceof Error ? error.message : "Fetch failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await ensureProjectsTable();

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
    };

    const projectName =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : "Untitled Project";

    const createdConfig = await sql<{
      upload_id: string;
      updated_at: Date;
      payload: unknown;
      background_image: string | null;
    }>`
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
        ${userId},
        ${JSON.stringify([])}::jsonb,
        null,
        ${buildShareCode8()},
        false
      )
      returning upload_id, updated_at, payload, background_image
    `.execute(db);

    const config = createdConfig.rows[0];
    if (!config) {
      throw new Error("Failed to create project config.");
    }

    await sql`
      insert into public.project_manager_entries (upload_id, user_id, name, status)
      values (${config.upload_id}::uuid, ${userId}, ${projectName}, 'active')
    `.execute(db);

    return NextResponse.json(
      {
        project: {
          uploadId: config.upload_id,
          name: projectName,
          status: "active",
          updatedAt: config.updated_at,
          stageCount: inferStageCount(config.payload),
          backgroundImage: config.background_image,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("/api/projects POST failed", error);
    const message = error instanceof Error ? error.message : "Create failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
