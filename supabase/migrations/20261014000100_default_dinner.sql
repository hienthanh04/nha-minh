-- Additive change. Keep all existing plans, check-ins and history.
begin;

create or replace function public.require_eating_dinner_plan()
returns trigger language plpgsql security invoker set search_path = public as $$
declare selected_plan public.dinner_plan;
begin
  -- Materialize the implicit eating plan only when a check-in is written.
  -- This runs in the SAME transaction and with the caller's RLS permissions.
  if new.date >= date '2026-10-14' then
    insert into public.dinner_plans(member_id,date,plan)
    values(new.member_id,new.date,'eating')
    on conflict(member_id,date) do nothing;
  end if;

  select plan into selected_plan from public.dinner_plans
  where member_id=new.member_id and date=new.date for update;
  if selected_plan is distinct from 'eating'::public.dinner_plan then
    raise exception 'A dinner check-in requires an eating plan';
  end if;
  return new;
end;
$$;

commit;
