-- Supabase/Postgres SQL migration for persistent user-scoped uploads/autosave metadata.
create extension if not exists pgcrypto;

alter table public.field_configs
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists upload_id uuid,
  add column if not exists content_hash varchar(64),
  add column if not exists background_image text,
  add column if not exists is_draft boolean not null default true;

update public.field_configs
set
  upload_id = coalesce(upload_id, gen_random_uuid()),
  content_hash = coalesce(content_hash, encode(digest(coalesce(payload::text, ''), 'sha256'), 'hex')),
  updated_at = coalesce(updated_at, created_at),
  is_draft = coalesce(is_draft, true)
where upload_id is null
   or content_hash is null
   or updated_at is null
   or is_draft is null;

alter table public.field_configs
  alter column upload_id set not null,
  alter column content_hash set not null;

create unique index if not exists field_configs_upload_id_key
  on public.field_configs (upload_id);

create index if not exists field_configs_user_updated_idx
  on public.field_configs (user_id, updated_at desc);

create index if not exists field_configs_user_draft_updated_idx
  on public.field_configs (user_id, is_draft, updated_at desc);

create index if not exists field_configs_user_hash_idx
  on public.field_configs (user_id, content_hash);