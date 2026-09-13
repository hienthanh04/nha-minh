-- Run the COMPLETE file in Supabase SQL Editor AFTER both migrations.
-- For an EMPTY family database only. Test users are transactional and rolled back.
-- This tests PostgreSQL RLS using actual anon/authenticated roles; it does not test login/JWT issuance.
begin;
do $$ begin
  if exists (select 1 from public.profiles) then
    raise exception 'STOP: this fixture test requires an empty profiles table. No data was changed.';
  end if;
end $$;

create temporary table phase2_results (test text, result text) on commit drop;
grant insert, select on phase2_results to anon, authenticated;
create function pg_temp.check_true(ok boolean, label text) returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'FAIL: %', label; end if;
  insert into pg_temp.phase2_results values (label, 'PASS');
end $$;
create function pg_temp.expect_error(statement text, expected_code text, label text)
returns void language plpgsql as $$
declare failed boolean := false;
begin
  begin
    execute statement;
  exception when others then
    if sqlstate <> expected_code then raise; end if;
    failed := true;
  end;
  perform pg_temp.check_true(failed, label);
end $$;

-- Fake IDs without email/password: these are never usable login accounts.
insert into auth.users(id) select ('f2000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid from generate_series(1,6) i;
insert into public.profiles(id,display_name,role,member_slot)
select ('f2000000-0000-0000-0000-' || lpad(i::text,12,'0'))::uuid,
  'TEST ' || i, case when i=1 then 'admin' else 'member' end::public.profile_role, i
from generate_series(1,5) i;
insert into public.housework_weeks(week_start,responsible_member_id)
values (date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh')::date,'f2000000-0000-0000-0000-000000000002');

select pg_temp.check_true((select count(*)=12 and bool_and(relrowsecurity)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'), '12 application tables all have RLS');

set local role anon;
do $$ declare t text; visible bigint;
begin
  foreach t in array array['profiles','kitchen_templates','kitchen_template_slots','kitchen_duties',
    'dinner_plans','dinner_checkins','housework_rotations','housework_rotation_members',
    'housework_weeks','housework_checkins','food_households','food_batches'] loop
    execute format('select count(*) from public.%I',t) into visible;
    perform pg_temp.check_true(visible=0,'anon cannot read ' || t);
  end loop;
end $$;
reset role;

set local request.jwt.claim.sub = 'f2000000-0000-0000-0000-000000000006';
set local role authenticated;
select pg_temp.check_true((select count(*)=0 from public.profiles),'Auth user without profile cannot read family');
select pg_temp.expect_error($q$insert into public.dinner_plans(member_id,date,plan)
  values ('f2000000-0000-0000-0000-000000000006',current_date,'eating')$q$,'42501','Unprofiled user cannot write dinner');
reset role;

set local request.jwt.claim.sub = 'f2000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.check_true((select count(*)=5 from public.profiles),'Member can read all five profiles');
select pg_temp.check_true((select count(*)=1 from public.housework_weeks),'Member can read family schedule');
with changed as (update public.profiles set role='admin' where id=auth.uid() returning id)
select pg_temp.check_true((select count(*)=0 from changed),'Member cannot promote self');
select pg_temp.expect_error($q$insert into public.food_households(name,rotation_position) values ('TEST',0)$q$,
  '42501','Member cannot edit household configuration');
select pg_temp.expect_error($q$insert into public.dinner_plans(member_id,date,plan)
  values ('f2000000-0000-0000-0000-000000000003',(now() at time zone 'Asia/Ho_Chi_Minh')::date,'eating')$q$,
  '42501','Member cannot plan for another person');
select pg_temp.expect_error($q$insert into public.dinner_plans(member_id,date,plan)
  values (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date-1,'eating')$q$,
  '42501','Member cannot edit past dinner plan');
insert into public.dinner_plans(member_id,date,plan) values
  (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date,'eating'),
  (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date+1,'eating');
select pg_temp.check_true((select count(*)=2 from public.dinner_plans where member_id=auth.uid()),'Own today/future dinner plans allowed');
insert into public.dinner_checkins(member_id,date) values (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date);
select pg_temp.check_true((select count(*)=1 from public.dinner_checkins),'Own eating check-in allowed');
select pg_temp.expect_error($q$insert into public.dinner_checkins(member_id,date)
  values (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date+1)$q$,'42501','Future dinner check-in denied');
select pg_temp.expect_error($q$update public.dinner_plans set plan='not_eating'
  where member_id=auth.uid() and date=(now() at time zone 'Asia/Ho_Chi_Minh')::date$q$,
  'P0001','Cannot change plan while eaten check-in exists');
with changed as (delete from public.dinner_checkins where member_id=auth.uid() returning member_id)
select pg_temp.check_true((select count(*)=0 from changed),'Member cannot erase confirmation before undo is implemented');

insert into public.housework_checkins(member_id,date) values (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date);
select pg_temp.check_true((select count(*)=1 from public.housework_checkins),'Responsible member can check in today');
-- Both dates below stay in this member's assigned week (regardless of today's weekday).
select pg_temp.expect_error($q$insert into public.housework_checkins(member_id,date)
  values (auth.uid(), date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh')::date
    + case when extract(isodow from now() at time zone 'Asia/Ho_Chi_Minh')=1 then 1 else 0 end)$q$,
  '42501','Responsible member cannot check in another day');
with changed as (update public.housework_checkins set completed_at=now()-interval '1 hour' where member_id=auth.uid() returning id)
select pg_temp.check_true((select count(*)=0 from changed),'Member cannot rewrite a saved housework timestamp');
reset role;

set local request.jwt.claim.sub = 'f2000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.expect_error($q$insert into public.housework_checkins(member_id,date)
  values (auth.uid(),(now() at time zone 'Asia/Ho_Chi_Minh')::date)$q$,
  'P0001','Wrong member cannot confirm housework');
reset role;

set local request.jwt.claim.sub = 'f2000000-0000-0000-0000-000000000001';
set local role authenticated;
with changed as (update public.dinner_checkins set completed_at=now()-interval '1 hour'
  where member_id='f2000000-0000-0000-0000-000000000002' returning member_id)
select pg_temp.check_true((select count(*)=1 from changed),'Admin can correct another member dinner check-in');
delete from public.dinner_checkins where member_id='f2000000-0000-0000-0000-000000000002';
with changed as (update public.dinner_plans set plan='not_eating'
  where member_id='f2000000-0000-0000-0000-000000000002' returning member_id)
select pg_temp.check_true((select count(*)=2 from changed),'Admin can correct another member dinner plans');
select pg_temp.expect_error($q$insert into public.dinner_checkins(member_id,date)
  values ('f2000000-0000-0000-0000-000000000002',(now() at time zone 'Asia/Ho_Chi_Minh')::date)$q$,
  'P0001','Admin corrections still require eating plan');
with changed as (update public.housework_checkins set completed_at=now()-interval '1 hour'
  where member_id='f2000000-0000-0000-0000-000000000002' returning id)
select pg_temp.check_true((select count(*)=1 from changed),'Admin can correct another member housework');
select pg_temp.expect_error($q$update public.housework_weeks
  set responsible_member_id='f2000000-0000-0000-0000-000000000003'$q$,
  '23001','Existing housework history protects its weekly assignment');
select pg_temp.expect_error($q$delete from public.housework_weeks$q$,'23001','Cannot delete referenced housework week');
select pg_temp.expect_error($q$update public.profiles set role='member' where id=auth.uid()$q$,
  'P0001','Cannot demote last admin');

-- Create a complete week in one transaction; test count validation before rollback.
insert into public.kitchen_duties(date,duty_type,slot_number,assigned_to)
select date '2030-01-07'+d, case when s=2 then 'dishes' else 'cook' end::public.kitchen_duty_type,
  case when s=2 then 1 else s+1 end,
  ('f2000000-0000-0000-0000-'||lpad((((d+s)%5)+1)::text,12,'0'))::uuid
from generate_series(0,4) d cross join generate_series(0,2) s;
set constraints all immediate;
select pg_temp.check_true((select count(*)=15 from public.kitchen_duties),'Complete balanced kitchen week allowed');
select pg_temp.expect_error($q$delete from public.kitchen_duties where date='2030-01-07' and duty_type='dishes'$q$,
  'P0001','Incomplete kitchen week rejected');
select pg_temp.expect_error($q$update public.kitchen_duties set assigned_to='f2000000-0000-0000-0000-000000000005'
  where date='2030-01-07' and duty_type='cook' and slot_number=1$q$,'P0001','Uneven original allocation rejected');
select pg_temp.expect_error($q$insert into public.kitchen_templates(effective_from) values ('2030-01-07')$q$,
  'P0001','Empty kitchen template rejected');
insert into public.food_households(id,name,rotation_position) values ('f3000000-0000-0000-0000-000000000001','TEST HOUSE',0);
insert into public.food_batches(household_id,status) values ('f3000000-0000-0000-0000-000000000001','waiting');
select pg_temp.expect_error($q$insert into public.food_batches(household_id,status,start_date)
 values ('f3000000-0000-0000-0000-000000000001','active',current_date)$q$,
 '23505','Waiting plus active food batches cannot coexist');
reset role;

select test, result from pg_temp.phase2_results order by test;
rollback;
