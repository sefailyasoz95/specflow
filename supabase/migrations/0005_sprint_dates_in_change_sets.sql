-- Sprints carry dates now, so a change set has to be able to set them.
-- Same function, two more fields; everything else is unchanged.

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
          (project_id, name, goal, position, status, start_date, end_date)
        values
          (cs.project_id, op ->> 'name', op ->> 'goal',
           coalesce((op ->> 'position')::int, seq),
           coalesce(nullif(op ->> 'status', ''), 'planned'),
           nullif(op ->> 'startDate', '')::date,
           nullif(op ->> 'endDate', '')::date)
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
          name       = coalesce(nullif(op ->> 'name', ''), s.name),
          goal       = coalesce(op ->> 'goal', s.goal),
          status     = coalesce(nullif(op ->> 'status', ''), s.status),
          start_date = coalesce(nullif(op ->> 'startDate', '')::date, s.start_date),
          end_date   = coalesce(nullif(op ->> 'endDate', '')::date, s.end_date)
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
