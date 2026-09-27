-- Disposable local database only. npm.cmd run test:db owns the fixtures.
begin;
do $$ begin
  if exists(select 1 from public.profiles) then raise exception 'STOP: use an empty test database for housework fixtures.'; end if;
end $$;
create temporary table housework_results(test text,result text);
grant select,insert on housework_results to authenticated,anon;
create function pg_temp.check_housework(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %',label; end if;
  insert into housework_results values(label,'PASS');
end $$;
create function pg_temp.deny_housework(command text,expected_code text,label text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin execute command;
  exception when others then
    if sqlstate<>expected_code then raise; end if;
    rejected:=true;
  end;
  perform pg_temp.check_housework(rejected,label);
end $$;
create function pg_temp.hw_today() returns date language sql stable as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;
create function pg_temp.hw_monday() returns date language sql stable as $$ select date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh')::date $$;
insert into auth.users(id) select ('f6000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,display_name,role,member_slot)
  select id,'TEST '||right(id::text,1),case when right(id::text,1)='1' then 'admin' else 'member' end::public.profile_role,
  right(id::text,1)::int from auth.users where right(id::text,1)::int<=5;
create temporary table housework_fixture as
  select array_agg(('f6000000-0000-0000-0000-'||lpad(((n%5)+1)::text,12,'0'))::uuid order by n) members from generate_series(1,5)n;
grant select on housework_fixture to authenticated;
-- Recorded historical assignment, independent of the new rotation.
insert into public.housework_weeks(week_start,responsible_member_id)
  values(pg_temp.hw_monday()-7,'f6000000-0000-0000-0000-000000000002');
set local request.jwt.claim.sub='f6000000-0000-0000-0000-000000000001';
set local role authenticated;
select housework_ensure_week(pg_temp.hw_monday());
select pg_temp.check_housework((select count(*)=0 from housework_weeks where week_start=pg_temp.hw_monday()),'No rotation means no fabricated assignment');
select pg_temp.deny_housework('select housework_save_rotation(pg_temp.hw_monday()+1,members) from housework_fixture','P6001','Start date must be Monday');
select pg_temp.deny_housework('select housework_save_rotation(pg_temp.hw_monday(),members[1:4]) from housework_fixture','P6002','Incomplete rotation rejected');
select pg_temp.deny_housework('select housework_save_rotation(pg_temp.hw_monday(),array[members[1],members[1],members[3],members[4],members[5]]) from housework_fixture','P6002','Duplicate rotation member rejected');
select housework_save_rotation(pg_temp.hw_monday(),members) from housework_fixture;
select pg_temp.check_housework((select count(*)=5 from housework_rotation_members),'Exactly five positions stored atomically');
select housework_ensure_week(pg_temp.hw_monday()+7*i) from generate_series(0,5)i;
select housework_ensure_week(pg_temp.hw_monday());
select pg_temp.check_housework((select count(*)=1 from housework_weeks where week_start=pg_temp.hw_monday()),'Repeated generation stores one weekly assignment');
select pg_temp.check_housework((select bool_and(w.responsible_member_id=f.members[(i%5)+1]) from generate_series(0,5)i cross join housework_fixture f join housework_weeks w on w.week_start=pg_temp.hw_monday()+7*i),'Six-week sequence wraps to first member');
select pg_temp.check_housework((select count(*)=0 from housework_weeks where week_start=pg_temp.hw_monday()-14),'History has no invented missing weeks');
select housework_ensure_week(pg_temp.hw_monday()-14);
select pg_temp.check_housework((select count(*)=0 from housework_weeks where week_start=pg_temp.hw_monday()-14),'History read does not generate old assignments');
select pg_temp.deny_housework('select housework_save_rotation(pg_temp.hw_monday(),members) from housework_fixture','P6003','Existing rotation cannot be revised for current week');
select housework_save_rotation(pg_temp.hw_monday()+7,array[members[5],members[4],members[3],members[2],members[1]]) from housework_fixture;
select pg_temp.deny_housework('select housework_save_rotation(pg_temp.hw_monday()+7,members[1:4]) from housework_fixture','P6002','Invalid revision fails atomically');
select pg_temp.check_housework((select count(*)=10 from housework_rotation_members),'Failed revision preserves saved rotation rows');
select housework_ensure_week(pg_temp.hw_monday()+7);
select pg_temp.check_housework((select responsible_member_id='f6000000-0000-0000-0000-000000000003'::uuid from housework_weeks where week_start=pg_temp.hw_monday()+7),'Rotation edit keeps already assigned future weeks');
select housework_ensure_week(pg_temp.hw_monday()+42);
select pg_temp.check_housework((select responsible_member_id='f6000000-0000-0000-0000-000000000001'::uuid from housework_weeks where week_start=pg_temp.hw_monday()+42),'Missing future week uses new effective rotation');
select pg_temp.check_housework((select responsible_member_id='f6000000-0000-0000-0000-000000000002'::uuid from housework_weeks where week_start=pg_temp.hw_monday()-7),'Rotation changes preserve historical assignment');
reset role;
create temporary table housework_snapshot as select updated_at from housework_weeks where week_start=pg_temp.hw_monday()+7;
grant select on housework_snapshot to authenticated;
set local role authenticated;
select housework_assign_week(pg_temp.hw_monday()+7,'f6000000-0000-0000-0000-000000000005',updated_at) from housework_snapshot;
select pg_temp.check_housework((select responsible_member_id='f6000000-0000-0000-0000-000000000005'::uuid from housework_weeks where week_start=pg_temp.hw_monday()+7),'Admin can set future weekly exception');
select pg_temp.deny_housework($q$select housework_assign_week(pg_temp.hw_monday()+7,'f6000000-0000-0000-0000-000000000004',updated_at) from housework_snapshot$q$,'P6004','Stale assignment edit rejected');
select housework_ensure_week(pg_temp.hw_monday()+7);
select pg_temp.check_housework((select responsible_member_id='f6000000-0000-0000-0000-000000000005'::uuid from housework_weeks where week_start=pg_temp.hw_monday()+7),'Generation preserves explicit weekly exception');
select pg_temp.deny_housework($q$select housework_assign_week(pg_temp.hw_monday(),'f6000000-0000-0000-0000-000000000004')$q$,'P6003','Recorded current week cannot be reassigned');
select pg_temp.deny_housework($q$select housework_assign_week(pg_temp.hw_monday()-7,'f6000000-0000-0000-0000-000000000004')$q$,'P6003','Historical week cannot be reassigned');
select pg_temp.deny_housework('update housework_weeks set responsible_member_id=auth.uid()','42501','Admin cannot bypass protected assignment save');
select pg_temp.deny_housework('delete from housework_rotation_members','42501','Admin cannot bypass atomic rotation save');
reset role;
set local request.jwt.claim.sub='f6000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.deny_housework($q$insert into housework_checkins(member_id,date) values('f6000000-0000-0000-0000-000000000002',pg_temp.hw_today())$q$,'42501','Non-responsible member cannot spoof responsible UUID');
select pg_temp.deny_housework('insert into housework_checkins(member_id,date) values(auth.uid(),pg_temp.hw_today())','P0001','Non-responsible member cannot check in');
select housework_save_rotation(pg_temp.hw_monday()+70,members) from housework_fixture;
select pg_temp.check_housework((select count(*)=1 from housework_rotations where effective_from=pg_temp.hw_monday()+70),'Member can change future rotation');
select housework_assign_week(pg_temp.hw_monday()+70,auth.uid());
select pg_temp.check_housework((select responsible_member_id=auth.uid() from housework_weeks where week_start=pg_temp.hw_monday()+70),'Member can assign a future week');
reset role;
set local request.jwt.claim.sub='f6000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.deny_housework('insert into housework_checkins(member_id,date) values(auth.uid(),pg_temp.hw_monday()-7)','42501','Responsible member cannot check in past day');
select pg_temp.deny_housework('insert into housework_checkins(member_id,date) values(auth.uid(),pg_temp.hw_monday()+35)','42501','Responsible member cannot check in future day');
select pg_temp.deny_housework($q$insert into housework_checkins(member_id,date,completed_at) values(auth.uid(),pg_temp.hw_today(),now()-interval '1 hour')$q$,'42501','Member cannot submit invented timestamp');
insert into housework_checkins(member_id,date) values(auth.uid(),pg_temp.hw_today());
select pg_temp.check_housework((select count(*)=1 and bool_and(member_id=auth.uid() and completed_at=now()) from housework_checkins),'Responsible member confirms today with database timestamp');
select pg_temp.deny_housework('insert into housework_checkins(member_id,date) values(auth.uid(),pg_temp.hw_today())','23505','Duplicate check-in rejected');
update housework_checkins set completed_at=now()-interval '1 hour';
delete from housework_checkins;
select pg_temp.check_housework((select count(*)=1 and bool_and(completed_at=now()) from housework_checkins),'Repeated request and member corrections preserve original timestamp');
reset role;
set local request.jwt.claim.sub='f6000000-0000-0000-0000-000000000001';
set local role authenticated;
update housework_checkins set completed_at=now()-interval '1 minute' where date=pg_temp.hw_today();
delete from housework_checkins where date=pg_temp.hw_today() and completed_at=now();
select pg_temp.check_housework((select completed_at=now()-interval '1 minute' from housework_checkins),'Admin correction succeeds; stale removal preserves newer record');
insert into housework_checkins(member_id,date,completed_at) values('f6000000-0000-0000-0000-000000000002',pg_temp.hw_monday()-7,now()-interval '7 days');
select pg_temp.check_housework((select count(*)=2 from housework_checkins),'Admin can add historical check-in for recorded responsible person');
select pg_temp.deny_housework('insert into housework_checkins(member_id,date) values(auth.uid(),pg_temp.hw_monday()-6)','P0001','Admin correction still matches recorded responsible member');
delete from housework_checkins where date=pg_temp.hw_today() and completed_at=now()-interval '1 minute';
select pg_temp.check_housework((select count(*)=0 from housework_checkins where date=pg_temp.hw_today()),'Admin can remove accidental check-in');
reset role;
set local request.jwt.claim.sub='f6000000-0000-0000-0000-000000000003';
set local role authenticated;
select housework_correct(pg_temp.hw_monday()-6,null,now()-interval '6 days');
select pg_temp.check_housework((select member_id='f6000000-0000-0000-0000-000000000002'::uuid from housework_checkins where date=pg_temp.hw_monday()-6),'Member correction credits recorded responsible person, not editor');
select housework_correct(pg_temp.hw_monday()-6,now()-interval '6 days',now()-interval '5 days');
select pg_temp.check_housework((select completed_at=now()-interval '5 days' from housework_checkins where date=pg_temp.hw_monday()-6),'Member can correct another person historical timestamp');
select pg_temp.deny_housework($q$select housework_correct(pg_temp.hw_monday()-6,now()-interval '6 days',null)$q$,'P6004','Stale member removal cannot erase newer correction');
select pg_temp.deny_housework($q$select housework_correct(pg_temp.hw_monday()-6,null,now())$q$,'P6004','Retry cannot overwrite existing check-in');
select housework_correct(pg_temp.hw_monday()-6,now()-interval '5 days',null);
select pg_temp.check_housework((select count(*)=0 from housework_checkins where date=pg_temp.hw_monday()-6),'Member can remove accidental historical check-in');
select pg_temp.deny_housework($q$select housework_correct(pg_temp.hw_today()+1,null,now())$q$,'P6005','Member correction cannot confirm future day');
select pg_temp.deny_housework($q$select housework_correct(pg_temp.hw_today(),null,now()+interval '1 hour')$q$,'P6005','Member correction cannot save future timestamp');
select pg_temp.deny_housework($q$select housework_correct(pg_temp.hw_monday()-14,null,now())$q$,'P6002','Correction requires existing assignment');
select pg_temp.deny_housework($q$select housework_assign_week(pg_temp.hw_monday(),auth.uid())$q$,'P6003','Member cannot reassign current week');
with changed as (update profiles set role='admin' where id=auth.uid() returning id)
select pg_temp.check_housework((select count(*)=0 from changed),'Housework editor cannot elevate role');
reset role;
set local request.jwt.claim.sub='f6000000-0000-0000-0000-000000000006';
set local role authenticated;
select pg_temp.check_housework((select count(*)=0 from housework_weeks),'Unknown Auth account cannot read assignments');
select pg_temp.check_housework((select count(*)=0 from housework_checkins),'Unknown Auth account cannot read history');
select pg_temp.deny_housework('select housework_ensure_week(pg_temp.hw_monday())','42501','Unknown Auth account cannot generate weeks');
select pg_temp.deny_housework('select housework_save_rotation(pg_temp.hw_monday()+77,array[]::uuid[])','42501','Unknown Auth cannot edit rotation');
select pg_temp.deny_housework('select housework_assign_week(pg_temp.hw_monday()+77,auth.uid())','42501','Unknown Auth cannot assign week');
select pg_temp.deny_housework('select housework_correct(pg_temp.hw_today(),null,now())','42501','Unknown Auth cannot correct confirmations');
reset role;
set local request.jwt.claim.sub='';
set local role anon;
select pg_temp.check_housework((select count(*)=0 from housework_weeks),'Anonymous cannot read assignments');
select pg_temp.deny_housework('select housework_ensure_week(pg_temp.hw_monday())','42501','Anonymous cannot call generation');
select pg_temp.deny_housework('select housework_correct(pg_temp.hw_today(),null,now())','42501','Anonymous cannot correct confirmations');
reset role;
select * from housework_results;
rollback;
