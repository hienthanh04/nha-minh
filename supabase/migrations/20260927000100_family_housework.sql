-- Family members may manage housework; preserve existing assignments and history.
-- Run this new file once. It already includes BEGIN / COMMIT.
begin;
create or replace function public.housework_save_rotation(p_week date, p_members uuid[])
returns void language plpgsql security definer set search_path = public as $$
declare rotation uuid; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; monday date;
begin
  if not public.is_family_member() then raise exception 'Family only' using errcode='42501'; end if;
  monday := today - (extract(isodow from today)::int - 1);
  if p_week is null or extract(isodow from p_week) <> 1 then raise exception 'Monday required' using errcode='P6001'; end if;
  if p_week < monday or (p_week = monday and exists(select 1 from public.housework_rotations)) then
    raise exception 'Rotation changes start in a future week' using errcode='P6003';
  end if;
  if (select count(*) from public.profiles) <> 5 or cardinality(p_members) is distinct from 5
    or (select count(distinct m) from unnest(p_members) m) <> 5
    or exists(select 1 from unnest(p_members) m where m is null or not exists(select 1 from public.profiles where id=m)) then
    raise exception 'Exactly five different family members required' using errcode='P6002';
  end if;
  insert into public.housework_rotations(effective_from) values(p_week)
    on conflict(effective_from) do update set effective_from=excluded.effective_from
    returning id into rotation;
  delete from public.housework_rotation_members where rotation_id=rotation;
  insert into public.housework_rotation_members(rotation_id,position,member_id)
    select rotation,(ordinality-1)::smallint,member from unnest(p_members) with ordinality as m(member,ordinality);
  -- Existing weeks are explicit recorded assignments, including admin exceptions.
  -- A rotation revision is used only for weeks that have not been created yet.
end;
$$;

create or replace function public.housework_assign_week(p_week date, p_member uuid, p_expected timestamptz default null)
returns void language plpgsql security definer set search_path = public as $$
declare today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; monday date; affected integer;
begin
  if not public.is_family_member() then raise exception 'Family only' using errcode='42501'; end if;
  monday := today-(extract(isodow from today)::int-1);
  if p_week is null or extract(isodow from p_week) <> 1 then raise exception 'Monday required' using errcode='P6001'; end if;
  if p_week < monday or (p_week=monday and exists(select 1 from public.housework_weeks where week_start=p_week)) then
    raise exception 'Keep current and historical assignments' using errcode='P6003';
  end if;
  if (select count(*) from public.profiles)<>5 or not exists(select 1 from public.profiles where id=p_member) then
    raise exception 'Family member required' using errcode='P6002';
  end if;
  if p_expected is null then
    insert into public.housework_weeks(week_start,responsible_member_id) values(p_week,p_member)
      on conflict(week_start) do nothing;
  else
    update public.housework_weeks set responsible_member_id=p_member
      where week_start=p_week and updated_at=p_expected;
  end if;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Assignment changed; refresh first' using errcode='P6004'; end if;
end;
$$;

-- Corrections are an explicit operation, distinct from the responsible person's
-- ordinary daily check-in. Keep raw member table writes restricted by RLS.
create function public.housework_correct(p_date date,p_expected timestamptz,p_at timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare member uuid; affected integer;
begin
  if not public.is_family_member() then raise exception 'Family only' using errcode='42501'; end if;
  if p_date is null or p_date>(now() at time zone 'Asia/Ho_Chi_Minh')::date
    or p_at>now() or (p_expected is null and p_at is null) then
    raise exception 'Invalid correction date/time' using errcode='P6005';
  end if;
  select responsible_member_id into member from public.housework_weeks
    where week_start=p_date-(extract(isodow from p_date)::integer-1);
  if not found then raise exception 'No assignment for this week' using errcode='P6002'; end if;
  if p_expected is null then
    insert into public.housework_checkins(member_id,date,completed_at) values(member,p_date,p_at)
      on conflict(date) do nothing;
  elsif p_at is null then
    delete from public.housework_checkins where date=p_date and member_id=member and completed_at=p_expected;
  else
    update public.housework_checkins set completed_at=p_at
      where date=p_date and member_id=member and completed_at=p_expected;
  end if;
  get diagnostics affected=row_count;
  if affected<>1 then raise exception 'Confirmation changed; reload' using errcode='P6004'; end if;
end;
$$;

revoke all on function public.housework_save_rotation(date,uuid[]) from public,anon;
revoke all on function public.housework_assign_week(date,uuid,timestamptz) from public,anon;
revoke all on function public.housework_correct(date,timestamptz,timestamptz) from public,anon;
grant execute on function public.housework_save_rotation(date,uuid[]) to authenticated;
grant execute on function public.housework_assign_week(date,uuid,timestamptz) to authenticated;
grant execute on function public.housework_correct(date,timestamptz,timestamptz) to authenticated;
commit;
