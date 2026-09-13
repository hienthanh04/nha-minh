-- Apply AFTER 20260912000100_initial_schema.sql.
-- This is an additive migration: no tables or family records are deleted.

-- Scope the original policies to signed-in requests. Anonymous reads have no policy.
do $$
declare p record;
begin
  for p in select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in (
      'profiles','kitchen_templates','kitchen_template_slots','kitchen_duties',
      'dinner_plans','dinner_checkins','housework_rotations','housework_rotation_members',
      'housework_weeks','housework_checkins','food_households','food_batches'
    )
  loop
    execute format('alter policy %I on public.%I to authenticated', p.policyname, p.tablename);
  end loop;
end $$;

drop policy dinner_plans_own_write on public.dinner_plans;
create policy dinner_plans_own_write on public.dinner_plans for all to authenticated
  using (public.is_family_member() and member_id = auth.uid()
    and date >= (now() at time zone 'Asia/Ho_Chi_Minh')::date)
  with check (public.is_family_member() and member_id = auth.uid()
    and date >= (now() at time zone 'Asia/Ho_Chi_Minh')::date);
create policy dinner_plans_admin_write on public.dinner_plans for all to authenticated
  using (public.is_family_admin()) with check (public.is_family_admin());

-- Members can confirm today. Corrections/undo are admin-only in this phase.
drop policy dinner_checkins_own_write on public.dinner_checkins;
create policy dinner_checkins_own_insert on public.dinner_checkins for insert to authenticated
  with check (public.is_family_member() and member_id = auth.uid()
    and date = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    and completed_at = now());
create policy dinner_checkins_admin_write on public.dinner_checkins for all to authenticated
  using (public.is_family_admin()) with check (public.is_family_admin());

drop policy housework_checkins_own_write on public.housework_checkins;
create policy housework_checkins_own_insert on public.housework_checkins for insert to authenticated
  with check (public.is_family_member() and member_id = auth.uid()
    and date = (now() at time zone 'Asia/Ho_Chi_Minh')::date
    and completed_at = now());
create policy housework_checkins_admin_write on public.housework_checkins for all to authenticated
  using (public.is_family_admin()) with check (public.is_family_admin());

-- A real FK preserves history even if an admin edits/deletes a weekly assignment.
-- PostgreSQL computes this date; clients must not provide it.
alter table public.housework_weeks add constraint housework_week_member_unique
  unique (week_start, responsible_member_id);
alter table public.housework_checkins add column week_start date
  generated always as (date - (extract(isodow from date)::integer - 1)) stored;
alter table public.housework_checkins add constraint housework_checkins_week_member_fk
  foreign key (week_start, member_id)
  references public.housework_weeks(week_start, responsible_member_id)
  on update restrict on delete restrict;

-- Serialize only on the relevant plan row, using an ordinary row lock, so a
-- simultaneous plan edit cannot leave a check-in attached to 'not_eating'.
create or replace function public.require_eating_dinner_plan()
returns trigger language plpgsql set search_path = public as $$
declare current_plan public.dinner_plan;
begin
  select plan into current_plan from public.dinner_plans
    where member_id = new.member_id and date = new.date for update;
  if current_plan is distinct from 'eating'::public.dinner_plan then
    raise exception 'A dinner check-in requires an eating plan';
  end if;
  return new;
end;
$$;

-- The 15-slot/three-per-member rule spans multiple rows. A deferred constraint
-- allows a whole week to be saved in one transaction, then validates at commit.
create function public.check_kitchen_week_allocation()
returns trigger language plpgsql set search_path = public as $$
declare affected_date date; monday date; duty_count integer;
begin
  for affected_date in select distinct d from unnest(array[
    case when tg_op <> 'INSERT' then old.date end,
    case when tg_op <> 'DELETE' then new.date end
  ]) d where d is not null loop
    monday := affected_date - (extract(isodow from affected_date)::integer - 1);
    select count(*) into duty_count from public.kitchen_duties where date between monday and monday + 4;
    if duty_count <> 0 and (duty_count <> 15 or exists (
      select assigned_to from public.kitchen_duties where date between monday and monday + 4
      group by assigned_to having count(*) <> 3
    )) then
      raise exception 'Save a complete kitchen week: 15 duties, three per member';
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger kitchen_week_allocation
  after insert or update or delete on public.kitchen_duties
  deferrable initially deferred for each row execute function public.check_kitchen_week_allocation();

-- Check template size/distribution at transaction end, including empty headers.
create function public.check_kitchen_template_allocation()
returns trigger language plpgsql set search_path = public as $$
declare template uuid;
begin
  for template in select id from public.kitchen_templates loop
    if (select count(*) from public.kitchen_template_slots where template_id = template) <> 15
      or exists (select assigned_to from public.kitchen_template_slots where template_id = template
                 group by assigned_to having count(*) <> 3) then
      raise exception 'Save a complete kitchen template: 15 slots, three per member';
    end if;
  end loop;
  return null;
end;
$$;
create constraint trigger kitchen_template_header_allocation after insert or update on public.kitchen_templates
  deferrable initially deferred for each row execute function public.check_kitchen_template_allocation();
create constraint trigger kitchen_template_slot_allocation after insert or update or delete on public.kitchen_template_slots
  deferrable initially deferred for each row execute function public.check_kitchen_template_allocation();

-- Existing data is checked too; do not silently bless a partial pre-existing week.
do $$
begin
  if exists (
    select date - (extract(isodow from date)::integer - 1) from public.kitchen_duties
    group by 1 having count(*) <> 15
  ) or exists (
    select date - (extract(isodow from date)::integer - 1), assigned_to from public.kitchen_duties
    group by 1, 2 having count(*) <> 3
  ) then raise exception 'Existing kitchen weeks need correction before this migration'; end if;
  if exists (select 1 from public.dinner_checkins c join public.dinner_plans p
    using (member_id, date) where p.plan <> 'eating') then
    raise exception 'Existing dinner check-ins need correction before this migration';
  end if;
end $$;

revoke all on function public.check_kitchen_week_allocation() from public;
revoke all on function public.check_kitchen_template_allocation() from public;
