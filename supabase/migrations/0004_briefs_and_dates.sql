-- A project now starts from something a human wrote or uploaded, so the
-- brief itself is stored: it is the provenance of every plan that follows,
-- and it is what an agent should read before proposing a change.

alter table public.projects
  add column if not exists tech_stack   text[] not null default '{}',
  add column if not exists start_date   date,
  add column if not exists end_date     date,
  add column if not exists sprint_length text;

alter table public.sprints
  add column if not exists start_date date,
  add column if not exists end_date   date;

create table if not exists public.project_briefs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  source      text not null check (source in ('written', 'upload')),
  file_name   text,
  mime_type   text,
  content     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists project_briefs_project_idx
  on public.project_briefs(project_id);

alter table public.project_briefs enable row level security;

drop policy if exists project_briefs_all on public.project_briefs;
create policy project_briefs_all on public.project_briefs
  for all using (public.owns_project(project_id))
  with check (public.owns_project(project_id));
