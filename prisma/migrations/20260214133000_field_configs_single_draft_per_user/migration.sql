-- Supabase/Postgres SQL: keep a single draft row per user and enforce with a partial unique index.

-- Keep the newest draft per user, remove older draft duplicates.
with ranked_drafts as (
  select
    id,
    user_id,
    row_number() over (
      partition by user_id
      order by updated_at desc nulls last, created_at desc nulls last
    ) as rn
  from public.field_configs
  where is_draft = true
)
delete from public.field_configs f
using ranked_drafts d
where f.id = d.id
  and d.rn > 1;

-- Enforce one draft row per user (final uploads remain append-only).
create unique index if not exists field_configs_one_draft_per_user_uidx
  on public.field_configs (user_id)
  where is_draft = true;