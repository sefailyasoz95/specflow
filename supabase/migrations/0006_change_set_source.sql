-- A change set can now be authored by three different parties, and the
-- review sheet says which. Calling Sprintfy's own planner "your agent"
-- was a lie of exactly the kind this product exists to prevent.

alter table public.change_sets
  drop constraint if exists change_sets_source_check;

alter table public.change_sets
  add constraint change_sets_source_check
  check (source in ('agent', 'planner', 'human'));
