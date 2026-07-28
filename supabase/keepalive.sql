-- Keep-Alive-Tabelle für den GitHub-Actions-Workflow (supabase-keepalive.yml).
-- Wird manuell im Supabase SQL-Editor ausgeführt. Idempotent: mehrfach ausführbar.

create table if not exists public.keepalive (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

insert into public.keepalive default values;

alter table public.keepalive enable row level security;

-- Postgres kennt kein "create policy if not exists" — drop davor macht das Skript idempotent.
drop policy if exists "keepalive_read" on public.keepalive;
create policy "keepalive_read" on public.keepalive
  for select to anon using (true);
