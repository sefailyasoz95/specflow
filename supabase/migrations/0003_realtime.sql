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
