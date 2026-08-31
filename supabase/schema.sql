-- SpecFlow — initial schema
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
-- Atomic application of an agent-authored change set.
-- Runs as the calling user (security invoker) so RLS still guards every write.

create or replace function public.sf_resolve_ref(p_refs jsonb, p_key text)
returns uuid
language plpgsql
immutable
as $$
declare
  v uuid;
begin
  if p_key is null or p_key = '' then
    return null;
  end if;
  if p_refs ? p_key then
    return (p_refs ->> p_key)::uuid;
  end if;
  begin
    v := p_key::uuid;
  exception when others then
    v := null;
  end;
  return v;
end;
$$;

create or replace function public.apply_change_set(p_change_set_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  cs        public.change_sets%rowtype;
  op        jsonb;
  refs      jsonb := '{}'::jsonb;
  new_id    uuid;
  v_sprint  uuid;
  v_req     uuid;
  v_code    text;
  n_applied int := 0;
  seq       int;
begin
  select * into cs from public.change_sets where id = p_change_set_id for update;
  if not found then
    raise exception 'change set % not found', p_change_set_id;
  end if;
  if cs.status <> 'pending' then
    raise exception 'change set is already %', cs.status;
  end if;

  for op in select * from jsonb_array_elements(cs.operations)
  loop
    case op ->> 'op'

      when 'create_requirement' then
        select count(*) + 1 into seq from public.requirements where project_id = cs.project_id;
        v_code := coalesce(nullif(op ->> 'code', ''), 'REQ-' || lpad(seq::text, 3, '0'));
        insert into public.requirements
          (project_id, code, title, description, priority, position)
        values
          (cs.project_id, v_code, op ->> 'title', op ->> 'description',
           coalesce(nullif(op ->> 'priority', ''), 'medium'),
           coalesce((op ->> 'position')::int, seq))
        returning id into new_id;

      when 'create_sprint' then
        select count(*) + 1 into seq from public.sprints where project_id = cs.project_id;
        insert into public.sprints
          (project_id, name, goal, position, status)
        values
          (cs.project_id, op ->> 'name', op ->> 'goal',
           coalesce((op ->> 'position')::int, seq),
           coalesce(nullif(op ->> 'status', ''), 'planned'))
        returning id into new_id;

      when 'create_task' then
        v_sprint := public.sf_resolve_ref(refs, op ->> 'sprintRef');
        v_req    := public.sf_resolve_ref(refs, op ->> 'requirementRef');
        select count(*) + 1 into seq from public.tasks where project_id = cs.project_id;
        insert into public.tasks
          (project_id, sprint_id, requirement_id, title, description, status, estimate_hours, position)
        values
          (cs.project_id, v_sprint, v_req, op ->> 'title', op ->> 'description',
           coalesce(nullif(op ->> 'status', ''), 'backlog'),
           (op ->> 'estimateHours')::numeric,
           coalesce((op ->> 'position')::int, seq))
        returning id into new_id;

      when 'update_task' then
        new_id := public.sf_resolve_ref(refs, op ->> 'taskId');
        update public.tasks t set
          title          = coalesce(nullif(op ->> 'title', ''), t.title),
          description    = coalesce(op ->> 'description', t.description),
          status         = coalesce(nullif(op ->> 'status', ''), t.status),
          estimate_hours = coalesce((op ->> 'estimateHours')::numeric, t.estimate_hours),
          sprint_id      = case when op ? 'sprintRef'
                                then public.sf_resolve_ref(refs, op ->> 'sprintRef')
                                else t.sprint_id end,
          requirement_id = case when op ? 'requirementRef'
                                then public.sf_resolve_ref(refs, op ->> 'requirementRef')
                                else t.requirement_id end
        where t.id = new_id and t.project_id = cs.project_id;

      when 'update_requirement' then
        new_id := public.sf_resolve_ref(refs, op ->> 'requirementId');
        update public.requirements r set
          title       = coalesce(nullif(op ->> 'title', ''), r.title),
          description = coalesce(op ->> 'description', r.description),
          priority    = coalesce(nullif(op ->> 'priority', ''), r.priority),
          status      = coalesce(nullif(op ->> 'status', ''), r.status)
        where r.id = new_id and r.project_id = cs.project_id;

      when 'update_sprint' then
        new_id := public.sf_resolve_ref(refs, op ->> 'sprintId');
        update public.sprints s set
          name   = coalesce(nullif(op ->> 'name', ''), s.name),
          goal   = coalesce(op ->> 'goal', s.goal),
          status = coalesce(nullif(op ->> 'status', ''), s.status)
        where s.id = new_id and s.project_id = cs.project_id;

      when 'delete_task' then
        new_id := public.sf_resolve_ref(refs, op ->> 'taskId');
        delete from public.tasks where id = new_id and project_id = cs.project_id;

      else
        raise exception 'unknown operation "%"', op ->> 'op';
    end case;

    if op ? 'tempId' and new_id is not null then
      refs := refs || jsonb_build_object(op ->> 'tempId', new_id::text);
    end if;

    n_applied := n_applied + 1;
  end loop;

  update public.change_sets
     set status = 'applied', resolved_at = now()
   where id = cs.id;

  return jsonb_build_object('applied', n_applied, 'refs', refs);
end;
$$;

grant execute on function public.apply_change_set(uuid) to authenticated;
grant execute on function public.owns_project(uuid)      to authenticated;
-- The workspace subscribes to these two tables so a plan applied in one
-- tab (or by an agent driving another) shows up immediately in the other.
-- New Supabase projects do not publish tables by default.

do $$
begin
  begin
    alter publication supabase_realtime add table public.tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.change_sets;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.sprints;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.requirements;
  exception when duplicate_object then null;
  end;
end $$;
