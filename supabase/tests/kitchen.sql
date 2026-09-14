-- Local/empty test database only. All fixtures roll back.
begin;
do $$ begin
 if exists(select 1 from public.profiles) then raise exception 'STOP: use an empty test database for kitchen fixtures.'; end if;
end $$;
create temporary table kitchen_results(test text, result text);
grant select,insert on kitchen_results to authenticated, anon;
create function pg_temp.check_kitchen(ok boolean, label text) returns void language plpgsql as $$
begin
 if ok is not true then raise exception 'FAIL: %',label; end if;
 insert into kitchen_results values(label,'PASS');
end $$;
create function pg_temp.deny_kitchen(command text, label text) returns void language plpgsql as $$
declare rejected boolean := false;
begin
 begin execute command;
 exception when sqlstate 'P0001' or insufficient_privilege then rejected := true;
 end;
 perform pg_temp.check_kitchen(rejected,label);
end $$;
insert into auth.users(id) select ('f4000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6) n;
insert into public.profiles(id,display_name,role,member_slot)
 select id, 'TEST '||right(id::text,1), case when right(id::text,1)='1' then 'admin' else 'member' end::public.profile_role,
 right(id::text,1)::int from auth.users where right(id::text,1)::int <= 5;
create temporary table kitchen_fixture as
 select jsonb_agg(jsonb_build_object('weekday',d+1,'duty_type',case when s=2 then 'dishes' else 'cook' end,
 'slot_number',case when s=2 then 1 else s+1 end,
 'assigned_to','f4000000-0000-0000-0000-'||lpad((((d+s)%5)+1)::text,12,'0')) order by d,s) slots,
 date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh')::date - 7 past,
 date_trunc('week',now() at time zone 'Asia/Ho_Chi_Minh')::date + 7 future
 from generate_series(0,4)d cross join generate_series(0,2)s;
grant select on kitchen_fixture to authenticated,anon;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_save_week(past,slots,false) from kitchen_fixture','Past edits require explicit correction');
select kitchen_save_week(past,slots,true) from kitchen_fixture;
set constraints all immediate;
set constraints all deferred;
select pg_temp.check_kitchen((select count(*)=15 from kitchen_duties),'Standard week has 15 duties');
select pg_temp.check_kitchen((select count(*)=5 from (select assigned_to from kitchen_duties group by assigned_to having count(*)=3)s),'Each member originally has 3 duties');
select pg_temp.deny_kitchen('select kitchen_save_week(past,slots - 0,true) from kitchen_fixture','Incomplete week rejected atomically');
select pg_temp.deny_kitchen($q$select kitchen_save_week(past,jsonb_set(slots,'{0,assigned_to}','"f4000000-0000-0000-0000-000000000005"'),true) from kitchen_fixture$q$,'Uneven distribution rejected');
select pg_temp.check_kitchen((select count(*)=15 from kitchen_duties),'Failed saves keep original week intact');
select kitchen_save_template(future, slots) from kitchen_fixture;
select kitchen_ensure_week(future) from kitchen_fixture;
select kitchen_ensure_week(future) from kitchen_fixture;
select pg_temp.check_kitchen((select count(*)=15 from kitchen_duties where date>=(select future from kitchen_fixture)),'Repeated generation produces one complete week');
select pg_temp.deny_kitchen('update kitchen_duties set completed_by=auth.uid()','Even admin uses protected operations instead of raw write');
reset role;
create temporary table kitchen_targets as
 select id, updated_at, completed_at from kitchen_duties
 where date=(select past from kitchen_fixture) and duty_type='cook' and slot_number=2;
grant select,update on kitchen_targets to authenticated;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_save_week(future,slots,false) from kitchen_fixture','Member cannot edit schedule');
select pg_temp.deny_kitchen('select kitchen_save_template(future,slots) from kitchen_fixture','Member cannot edit template');
select pg_temp.deny_kitchen('update kitchen_duties set assigned_to=auth.uid()','Member cannot rewrite assignment');
select pg_temp.deny_kitchen('select kitchen_complete(null)','Missing duty rejected');
select pg_temp.deny_kitchen($q$select kitchen_complete(id) from kitchen_duties where assigned_to=auth.uid() and date>=(select future from kitchen_fixture) limit 1$q$,'Future completion rejected');
select kitchen_complete(id) from kitchen_targets;
select pg_temp.check_kitchen((select completed_by=auth.uid() from kitchen_duties where id=(select id from kitchen_targets)),'Normal completion credits authenticated responsible member');
update kitchen_targets set completed_at=(select completed_at from kitchen_duties where id=kitchen_targets.id);
select pg_temp.deny_kitchen('select kitchen_complete(id) from kitchen_targets','Repeated completion rejected');
select pg_temp.check_kitchen((select d.completed_at=t.completed_at from kitchen_duties d join kitchen_targets t using(id)),'Retry preserves actual timestamp');
select pg_temp.deny_kitchen($q$select kitchen_delegate(id,'f4000000-0000-0000-0000-000000000003',updated_at) from kitchen_duties where id=(select id from kitchen_targets)$q$,'Completed duty cannot be delegated');
select pg_temp.deny_kitchen('select kitchen_correct(id,updated_at,null,null) from kitchen_targets','Member cannot correct records');
reset role;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_save_week(past,slots,true) from kitchen_fixture','Week with completion cannot be replaced');
select kitchen_correct(id,updated_at,null,null) from kitchen_duties where id=(select id from kitchen_targets);
select pg_temp.check_kitchen((select status='unconfirmed' and completed_by is null and completed_at is null from kitchen_duties where id=(select id from kitchen_targets)),'Admin correction can remove accidental confirmation');
reset role;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_delegate(id,auth.uid(),updated_at) from kitchen_duties where id=(select id from kitchen_targets)','Self delegation denied');
update kitchen_targets set updated_at=(select updated_at from kitchen_duties where id=kitchen_targets.id);
select kitchen_delegate(id,'f4000000-0000-0000-0000-000000000003',updated_at) from kitchen_targets;
select pg_temp.deny_kitchen('select kitchen_delegate(id,null,updated_at) from kitchen_targets','Stale delegation form rejected');
select pg_temp.deny_kitchen('select kitchen_complete(id) from kitchen_targets','Original assignee cannot complete after delegation');
select pg_temp.check_kitchen((select assigned_to=auth.uid() and delegated_to='f4000000-0000-0000-0000-000000000003'::uuid from kitchen_duties where id=(select id from kitchen_targets)),'Delegation preserves original assignment');
select kitchen_delegate(id,null,updated_at) from kitchen_duties where id=(select id from kitchen_targets);
select pg_temp.check_kitchen((select delegated_to is null from kitchen_duties where id=(select id from kitchen_targets)),'Original assignee can cancel before completion');
select kitchen_delegate(id,'f4000000-0000-0000-0000-000000000003',updated_at) from kitchen_duties where id=(select id from kitchen_targets);
reset role;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000004';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_complete(id) from kitchen_targets','Unrelated member cannot complete');
select pg_temp.deny_kitchen('select kitchen_delegate(id,null,updated_at) from kitchen_targets','Unrelated member cannot change delegation');
reset role;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000003';
set local role authenticated;
select pg_temp.deny_kitchen($q$select kitchen_delegate(id,'f4000000-0000-0000-0000-000000000004',updated_at) from kitchen_duties where id=(select id from kitchen_targets)$q$,'Delegate cannot delegate onward');
select kitchen_complete(id) from kitchen_targets;
select pg_temp.check_kitchen((select completed_by=auth.uid() and assigned_to<>auth.uid() from kitchen_duties where id=(select id from kitchen_targets)),'Delegated completion credits delegate only');
select pg_temp.check_kitchen((select date<(now() at time zone 'Asia/Ho_Chi_Minh')::date and completed_at>=now() from kitchen_duties where id=(select id from kitchen_targets)),'Late confirmation preserves old duty date and real timestamp');
reset role;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_correct(id,updated_at,null,null) from kitchen_targets','Stale admin correction rejected');
-- A revised template keeps an already generated future week unchanged.
select kitchen_save_template(future, (select jsonb_agg(jsonb_set(e,'{assigned_to}',
 to_jsonb('f4000000-0000-0000-0000-'||lpad((((right(e->>'assigned_to',1))::int % 5)+1)::text,12,'0'))))
 from jsonb_array_elements(slots)e)) from kitchen_fixture;
select pg_temp.check_kitchen((select assigned_to='f4000000-0000-0000-0000-000000000001'::uuid from kitchen_duties where date=(select future from kitchen_fixture) and duty_type='cook' and slot_number=1),'Template edits preserve existing weeks');
select kitchen_ensure_week(future+7) from kitchen_fixture;
select pg_temp.check_kitchen((select assigned_to='f4000000-0000-0000-0000-000000000002'::uuid from kitchen_duties where date=(select future+7 from kitchen_fixture) and duty_type='cook' and slot_number=1),'New week uses revised template');
reset role;
set local request.jwt.claim.sub='f4000000-0000-0000-0000-000000000006';
set local role authenticated;
select pg_temp.deny_kitchen('select kitchen_complete(null)','Unknown Auth account cannot mutate');
select pg_temp.deny_kitchen('select kitchen_ensure_week(future) from kitchen_fixture','Unknown Auth account cannot generate');
select pg_temp.check_kitchen((select count(*)=0 from kitchen_duties),'Unknown Auth account cannot read kitchen');
reset role;
set local role anon;
select pg_temp.deny_kitchen('select kitchen_complete(null)','Anonymous cannot call kitchen RPC');
select pg_temp.check_kitchen((select count(*)=0 from kitchen_duties),'Anonymous cannot read kitchen');
reset role;
set constraints all immediate;
select * from kitchen_results order by test;
rollback;
