-- A model call costs money whether or not it produces a project. Counting
-- projects would therefore miss the case that actually matters: a caller
-- feeding the planner briefs it keeps rejecting and paying for every one.
-- So the thing that gets counted is the call itself, recorded just before
-- the model is reached.

create table if not exists public.plan_runs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists plan_runs_user_created_idx
  on public.plan_runs (user_id, created_at desc);

alter table public.plan_runs enable row level security;

-- Read and insert your own, and nothing else. There is deliberately no
-- update or delete policy: with one, a caller holding the publishable key
-- could backdate or delete their own rows and reset the window at will.
drop policy if exists "plan_runs are readable by their owner" on public.plan_runs;
create policy "plan_runs are readable by their owner"
  on public.plan_runs for select
  using (auth.uid() = user_id);

drop policy if exists "plan_runs are inserted by their owner" on public.plan_runs;
create policy "plan_runs are inserted by their owner"
  on public.plan_runs for insert
  with check (auth.uid() = user_id);
