-- Sprintfy — initial schema
-- Agent-native project planning. Agents never mutate domain tables directly;
-- they author change_sets that a human approves.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- projects
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------ requirements
create table if not exists public.requirements (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  code        text not null,
  title       text not null,
  description text,
  priority    text not null default 'medium'
              check (priority in ('low','medium','high','critical')),
  status      text not null default 'draft'
              check (status in ('draft','approved','implemented')),
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------- sprints
create table if not exists public.sprints (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  name        text not null,
  goal        text,
  position    int  not null default 0,
  status      text not null default 'planned'
              check (status in ('planned','active','done')),
  created_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------- tasks
create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid not null references public.projects(id) on delete cascade,
  sprint_id      uuid references public.sprints(id) on delete set null,
  requirement_id uuid references public.requirements(id) on delete set null,
  title          text not null,
  description    text,
  status         text not null default 'backlog'
                 check (status in ('backlog','todo','in_progress','done')),
  estimate_hours numeric(6,1),
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------- change_sets
create table if not exists public.change_sets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  title       text not null,
  summary     text,
  source      text not null default 'agent' check (source in ('agent','human')),
  status      text not null default 'pending'
              check (status in ('pending','applied','discarded')),
  operations  jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists requirements_project_idx on public.requirements(project_id);
create index if not exists sprints_project_idx      on public.sprints(project_id);
create index if not exists tasks_project_idx        on public.tasks(project_id);
create index if not exists tasks_sprint_idx         on public.tasks(sprint_id);
create index if not exists change_sets_project_idx  on public.change_sets(project_id, status);

-- ------------------------------------------------------------------- RLS
alter table public.projects     enable row level security;
alter table public.requirements enable row level security;
alter table public.sprints      enable row level security;
alter table public.tasks        enable row level security;
alter table public.change_sets  enable row level security;

create or replace function public.owns_project(p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = auth.uid()
  );
$$;

drop policy if exists projects_all on public.projects;
create policy projects_all on public.projects
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists requirements_all on public.requirements;
create policy requirements_all on public.requirements
  for all using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

drop policy if exists sprints_all on public.sprints;
create policy sprints_all on public.sprints
  for all using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

drop policy if exists tasks_all on public.tasks;
create policy tasks_all on public.tasks
  for all using (public.owns_project(project_id))
  with check (public.owns_project(project_id));

drop policy if exists change_sets_all on public.change_sets;
create policy change_sets_all on public.change_sets
  for all using (public.owns_project(project_id))
  with check (public.owns_project(project_id));
