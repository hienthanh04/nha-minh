-- npm.cmd run test:db runs this in disposable local PostgreSQL. Never run on family data.
begin;
do $$ begin
 if exists(select 1 from profiles) then raise exception 'STOP: use an empty test database for dinner fixtures.'; end if;
end $$;
create temporary table dinner_results(test text, result text);
grant select,insert on dinner_results to authenticated,anon;
create function pg_temp.check_dinner(ok boolean,label text) returns void language plpgsql as $$
begin
 if ok is not true then raise exception 'FAIL: %',label; end if;
 insert into dinner_results values(label,'PASS');
end $$;
create function pg_temp.deny_dinner(command text,label text) returns void language plpgsql as $$
declare rejected boolean := false;
begin
 begin execute command;
 exception when sqlstate 'P0001' or restrict_violation or insufficient_privilege or unique_violation or foreign_key_violation then rejected := true;
 end;
 perform pg_temp.check_dinner(rejected,label);
end $$;
create function pg_temp.today_dinner() returns date language sql stable as $$
 select (now() at time zone 'Asia/Ho_Chi_Minh')::date
$$;
insert into auth.users(id) select ('f5000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into profiles(id,display_name,role,member_slot)
 select id,'TEST '||right(id::text,1),case when right(id::text,1)='1' then 'admin' else 'member' end::profile_role,
 right(id::text,1)::int from auth.users where right(id::text,1)::int<=5;
set local request.jwt.claim.sub='f5000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.check_dinner((select count(*)=5 from profiles),'Family sees five real profiles');
select pg_temp.check_dinner((select count(*)=0 from dinner_plans),'No initial plan: unknown');
select pg_temp.deny_dinner('insert into dinner_checkins(member_id,date) values(auth.uid(),pg_temp.today_dinner())','No check-in without plan');
insert into dinner_plans(member_id,date,plan) values(auth.uid(),pg_temp.today_dinner(),'not_eating');
select pg_temp.deny_dinner('insert into dinner_checkins(member_id,date) values(auth.uid(),pg_temp.today_dinner())','Not eating cannot check in');
insert into dinner_plans(member_id,date,plan) values(auth.uid(),pg_temp.today_dinner(),'eating') on conflict(member_id,date) do update set plan=excluded.plan;
select pg_temp.check_dinner((select count(*)=1 from dinner_plans),'Upsert changes plan without duplicate');
insert into dinner_checkins(member_id,date) values(auth.uid(),pg_temp.today_dinner());
select pg_temp.check_dinner((select completed_at=now() from dinner_checkins),'Database assigns original completion timestamp');
select pg_temp.deny_dinner('insert into dinner_checkins(member_id,date) values(auth.uid(),pg_temp.today_dinner())','Repeated check-in cannot overwrite timestamp');
select pg_temp.deny_dinner($q$update dinner_plans set plan='not_eating' where member_id=auth.uid()$q$,'Existing check-in prevents contradictory plan');
select pg_temp.deny_dinner('delete from dinner_plans where member_id=auth.uid()','Existing check-in prevents unknown plan');
delete from dinner_checkins where member_id=auth.uid();
update dinner_checkins set completed_at=now()-interval '1 hour' where member_id=auth.uid();
select pg_temp.check_dinner((select completed_at=now() from dinner_checkins),'Member cannot undo or rewrite check-in');
select pg_temp.deny_dinner($q$insert into dinner_plans(member_id,date,plan) values('f5000000-0000-0000-0000-000000000003',pg_temp.today_dinner(),'eating')$q$,'Member cannot plan for another member');
select pg_temp.deny_dinner($q$insert into dinner_checkins(member_id,date) values('f5000000-0000-0000-0000-000000000002',pg_temp.today_dinner()+1)$q$,'Member cannot confirm tomorrow');
select pg_temp.deny_dinner($q$insert into dinner_plans(member_id,date,plan) values(auth.uid(),pg_temp.today_dinner()-1,'eating')$q$,'Member cannot create past plan');
insert into dinner_plans(member_id,date,plan) values(auth.uid(),pg_temp.today_dinner()+1,'eating');
select pg_temp.check_dinner((select count(*)=2 from dinner_plans),'Member can plan tomorrow');
delete from dinner_plans where date=pg_temp.today_dinner()+1 and member_id=auth.uid();
select pg_temp.check_dinner((select count(*)=1 from dinner_plans),'Removing future plan restores unknown');
reset role;
set local request.jwt.claim.sub='f5000000-0000-0000-0000-000000000001';
set local role authenticated;
update dinner_checkins set completed_at=now()-interval '1 minute' where member_id='f5000000-0000-0000-0000-000000000002';
select pg_temp.check_dinner((select completed_at=now()-interval '1 minute' from dinner_checkins),'Admin can correct another member timestamp');
delete from dinner_checkins where member_id='f5000000-0000-0000-0000-000000000002' and completed_at=now();
select pg_temp.check_dinner((select count(*)=1 from dinner_checkins),'Stale conditional correction preserves newer timestamp');
delete from dinner_checkins where member_id='f5000000-0000-0000-0000-000000000002' and completed_at=now()-interval '1 minute';
update dinner_plans set plan='not_eating' where member_id='f5000000-0000-0000-0000-000000000002';
select pg_temp.check_dinner((select plan='not_eating' from dinner_plans),'Admin removes accidental check-in before changing plan');
insert into dinner_plans(member_id,date,plan) values('f5000000-0000-0000-0000-000000000002',pg_temp.today_dinner()-1,'eating');
insert into dinner_checkins(member_id,date,completed_at) values('f5000000-0000-0000-0000-000000000002',pg_temp.today_dinner()-1,now()-interval '1 day');
select pg_temp.check_dinner((select count(*)=1 from dinner_checkins),'Admin can correct historical dinner records');
reset role;
set local request.jwt.claim.sub='f5000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.check_dinner((select count(*)=2 from dinner_plans),'Other member sees family plans');
update dinner_plans set plan='eating' where member_id='f5000000-0000-0000-0000-000000000002' and date=pg_temp.today_dinner();
select pg_temp.check_dinner((select plan='not_eating' from dinner_plans where date=pg_temp.today_dinner()),'Other member cannot update family plan');
delete from dinner_plans where member_id='f5000000-0000-0000-0000-000000000002' and date=pg_temp.today_dinner();
select pg_temp.check_dinner((select count(*)=2 from dinner_plans),'Other member cannot remove family records');
select pg_temp.deny_dinner($q$insert into dinner_checkins(member_id,date) values('f5000000-0000-0000-0000-000000000002',pg_temp.today_dinner()-1)$q$,'Other member cannot check in by spoofed identity');
reset role;
set local request.jwt.claim.sub='f5000000-0000-0000-0000-000000000006';
set local role authenticated;
select pg_temp.check_dinner((select count(*)=0 from dinner_plans),'Unknown Auth account cannot read family plans');
select pg_temp.check_dinner((select count(*)=0 from dinner_checkins),'Unknown Auth account cannot read check-ins');
select pg_temp.deny_dinner($q$insert into dinner_plans(member_id,date,plan) values(auth.uid(),pg_temp.today_dinner(),'eating')$q$,'Unknown Auth account cannot write');
reset role;
set local request.jwt.claim.sub='';
set local role anon;
select pg_temp.check_dinner((select count(*)=0 from dinner_plans),'Anonymous cannot read family plans');
select pg_temp.check_dinner((select count(*)=0 from dinner_checkins),'Anonymous cannot read check-ins');
reset role;
select * from dinner_results;
rollback;
