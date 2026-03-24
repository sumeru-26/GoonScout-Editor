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
  scout_type: "match" | "qualitative" | "pit";
  updated_at: Date;
  config_updated_at: Date;
  payload: unknown;
  background_image: string | null;
  background_location: string | null;
  is_public?: boolean;
};

const buildShareCode8 = () =>
  `${Math.floor(Math.random() * 90_000_000) + 10_000_000}`;

const createProjectConfigWithRetry = async (input: {
  userId: string;
  isPublic: boolean;
  scoutType: "match" | "qualitative" | "pit";
}) => {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const createdConfig = await sql<{
        upload_id: string;
        updated_at: Date;
        payload: unknown;
        background_image: string | null;
        background_location: string | null;
      }>`
        insert into public.field_configs (
          id,
          upload_id,
          user_id,
          payload,
          background_image,
          background_location,
          content_hash,
          is_draft,
          is_public
        )
        values (
          ${randomUUID()}::uuid,
          ${randomUUID()}::uuid,
          ${input.userId},
          ${JSON.stringify({
            editorState: {
              items: [],
              aspectWidth: "16",
              aspectHeight: "9",
              backgroundImage: null,
              backgroundLocation: null,
              postMatchQuestions: [],
              scoutType: input.scoutType,
            },
            payload: [],
          })}::jsonb,
          null,
          null,
          ${buildShareCode8()},
          true,
          ${input.isPublic}
        )
        returning upload_id, updated_at, payload, background_image, background_location
      `.execute(db);

      const config = createdConfig.rows[0];
      if (!config) {
        throw new Error("Failed to create project config.");
      }

      return config;
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

  throw new Error("Unable to create project after multiple attempts.");
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

  await sql`
    alter table public.project_manager_entries
    add column if not exists scout_type text not null default 'match'
  `.execute(db);

  await sql`
    do $$
    begin
      begin
        alter table public.project_manager_entries
        add constraint project_manager_entries_scout_type_chk
        check (scout_type in ('match', 'qualitative', 'pit'));
      exception
        when duplicate_object then
          null;
      end;
    end
    $$
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

const ensureFieldConfigColumns = async () => {
  await sql`
    alter table public.field_configs
    add column if not exists background_location text,
    add column if not exists field_mapping jsonb
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
      and not exists (
        select 1
        from public.project_manager_entries p
        where p.upload_id = f.upload_id
      )
  `.execute(db);
};

const normalizePayloadArray = (payload: unknown) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.payload)) {
      return record.payload as Array<Record<string, unknown>>;
    }
  }
  return null;
};

const inferStageCount = (payload: unknown) => {
  const normalized = normalizePayloadArray(payload);
  if (!normalized) return 1;

  const stageParentTags = new Set<string>();
  for (const entry of normalized) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const element =
      (record.button as Record<string, unknown> | undefined) ??
      (record["icon-button"] as Record<string, unknown> | undefined) ??
      (record["text-input"] as Record<string, unknown> | undefined) ??
      (record["team-select"] as Record<string, unknown> | undefined) ??
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
    await ensureMultipleDraftsAllowed();
    await ensureFieldConfigColumns();
    await ensureProjectEntriesForUser(userId);

    const url = new URL(request.url);
    const rawStatus = url.searchParams.get("status")?.trim().toLowerCase();
    const status: ProjectStatus =
      rawStatus === "archive" || rawStatus === "trash" ? rawStatus : "active";

    let result;
    try {
      result = await sql<ProjectRow>`
        select
          p.upload_id,
          p.name,
          p.status,
          p.scout_type,
          p.updated_at,
          f.updated_at as config_updated_at,
          f.payload,
          f.background_image,
          f.background_location,
          f.is_public
        from public.project_manager_entries p
        join public.field_configs f on f.upload_id = p.upload_id
        where p.user_id = ${userId}
          and f.user_id = ${userId}
          and p.status = ${status}
        order by p.updated_at desc
      `.execute(db);
    } catch (error) {
      const pgCode =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        typeof (error as { code?: unknown }).code === "string"
          ? (error as { code: string }).code
          : null;

      if (pgCode !== "42703") {
        throw error;
      }

      result = await sql<ProjectRow>`
        select
          p.upload_id,
          p.name,
          p.status,
          p.scout_type,
          p.updated_at,
          f.updated_at as config_updated_at,
          f.payload,
          f.background_image,
          f.background_location,
          false as is_public
        from public.project_manager_entries p
        join public.field_configs f on f.upload_id = p.upload_id
        where p.user_id = ${userId}
          and f.user_id = ${userId}
          and p.status = ${status}
        order by p.updated_at desc
      `.execute(db);
    }

    const projects = result.rows.map((row) => ({
      uploadId: row.upload_id,
      name: row.name,
      status: row.status,
      scoutType: row.scout_type,
      updatedAt: row.updated_at,
      configUpdatedAt: row.config_updated_at,
      stageCount: inferStageCount(row.payload),
      backgroundImage: row.background_image,
      backgroundLocation: row.background_location,
      isPublic: row.is_public,
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
    await ensureFieldConfigColumns();

    const body = (await request.json().catch(() => ({}))) as {
      name?: string;
      isPublic?: boolean;
      scoutType?: "match" | "qualitative" | "pit";
    };

    const projectName =
      typeof body.name === "string" && body.name.trim().length > 0
        ? body.name.trim()
        : "Untitled Project";

    const isPublic = Boolean(body.isPublic ?? false);
    const scoutType: "match" | "qualitative" | "pit" =
      body.scoutType === "qualitative" || body.scoutType === "pit"
        ? body.scoutType
        : "match";

    const config = await createProjectConfigWithRetry({ userId, isPublic, scoutType });

    await sql`
      insert into public.project_manager_entries (upload_id, user_id, name, status, scout_type)
      values (${config.upload_id}::uuid, ${userId}, ${projectName}, 'active', ${scoutType})
    `.execute(db);

    return NextResponse.json(
      {
        project: {
          uploadId: config.upload_id,
          name: projectName,
          status: "active",
          scoutType,
          updatedAt: config.updated_at,
          stageCount: inferStageCount(config.payload),
          backgroundImage: config.background_image,
          backgroundLocation: config.background_location,
          isPublic,
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
