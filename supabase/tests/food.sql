-- Only run via npm.cmd run test:db in a disposable database, never the family project.
begin;
do $$ begin
  if exists(select 1 from public.profiles) then raise exception 'STOP: food fixtures require an empty test database'; end if;
end $$;
create temporary table food_results(test text,result text);
grant select,insert on food_results to authenticated,anon;
create function pg_temp.check_food(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %',label; end if;
  insert into food_results values(label,'PASS');
end $$;
create function pg_temp.deny_food(command text,expected text,label text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin execute command;
  exception when others then
    if sqlstate<>expected then raise; end if;
    rejected:=true;
  end;
  perform pg_temp.check_food(rejected,label);
end $$;
create function pg_temp.food_config() returns jsonb language sql as $$
  select jsonb_agg(to_jsonb(h) order by rotation_position) from public.food_households h
$$;
insert into auth.users(id) select ('f7000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,display_name,role,member_slot)
  select id,'TEST '||right(id::text,1),case when right(id::text,1)='1' then 'admin' else 'member' end::public.profile_role,
  right(id::text,1)::int from auth.users where right(id::text,1)::int<=5;
set local request.jwt.claim.sub='f7000000-0000-0000-0000-000000000001';
set local role authenticated;
select pg_temp.deny_food('select food_initialize(null)','P7001','No fake initialization without configured household');
select food_save_households('[{"name":"TEST A","rotation_position":0,"is_enabled":true},{"name":"TEST B","rotation_position":1,"is_enabled":true},{"name":"TEST C","rotation_position":2,"is_enabled":true}]');
select pg_temp.check_food((select count(*)=3 from food_households),'Admin adds three configured households');
select pg_temp.deny_food($q$select food_save_households(jsonb_set(pg_temp.food_config(),'{1,rotation_position}','0'))$q$,'P7001','Duplicate positions rejected');
select pg_temp.deny_food($q$select food_save_households((select jsonb_agg(to_jsonb(h)||'{"is_enabled":false}'::jsonb) from food_households h))$q$,'P7001','Cannot disable final enabled household');
select pg_temp.deny_food('select food_save_households(pg_temp.food_config()-0)','P7002','Configuration cannot delete saved household');
select pg_temp.check_food((select count(*)=3 and bool_and(is_enabled) from food_households),'Invalid save leaves configuration intact');
select food_initialize(id) from food_households where name='TEST A';
select pg_temp.check_food((select count(*)=1 and bool_and(status='waiting' and start_date is null) from food_batches),'Initialize creates one waiting batch without date');
select pg_temp.deny_food($q$select food_initialize(id) from food_households where name='TEST B'$q$,'P7003','Initialization retry cannot create another batch');
reset role;
create temporary table food_snapshot as select id,updated_at from food_batches;
grant select,update on food_snapshot to authenticated;
set local request.jwt.claim.sub='f7000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.deny_food('select food_save_households(pg_temp.food_config())','42501','Member cannot rename/reorder households');
select pg_temp.deny_food('delete from food_households','42501','Member cannot delete household history');
select pg_temp.deny_food($q$update food_batches set status='active'$q$,'42501','Member cannot manipulate raw batch state');
select pg_temp.deny_food('select food_finish(id,updated_at) from food_snapshot','P7002','Waiting cannot finish directly');
select food_receive(id,updated_at) from food_snapshot;
select pg_temp.check_food((select status='active' and start_date=(now() at time zone 'Asia/Ho_Chi_Minh')::date from food_batches),'Receipt activates batch using Vietnam date');
select pg_temp.deny_food('select food_receive(id,updated_at) from food_snapshot','P7002','Repeated receipt rejected without replacing date');
update food_snapshot set updated_at=(select updated_at from food_batches where id=food_snapshot.id);
select food_finish(id,updated_at) from food_snapshot;
select pg_temp.check_food((select status='finished' and finished_at=now() from food_batches where id=(select id from food_snapshot)),'Finish stores actual timestamp');
select pg_temp.check_food((select count(*)=1 and bool_and(status='waiting' and household_id=(select id from food_households where name='TEST B')) from food_batches where previous_batch_id=(select id from food_snapshot)),'Finish atomically creates next waiting household');
select pg_temp.deny_food('select food_finish(id,updated_at) from food_snapshot','P7002','Double finish cannot create another successor');
select pg_temp.deny_food($q$select food_receive(id,updated_at) from food_batches where status='finished'$q$,'P7002','Finished cannot receive again');
select pg_temp.check_food((select count(*)=2 from food_batches),'Only original and one successor after retries');
reset role;
set local request.jwt.claim.sub='f7000000-0000-0000-0000-000000000001';
set local role authenticated;
-- Reopen accidental finish while its sole successor is still waiting.
select food_correct(b.id,b.updated_at,'active',b.start_date,null,'TEST note',s.updated_at)
  from food_batches b join food_batches s on s.previous_batch_id=b.id where b.id=(select id from food_snapshot);
select pg_temp.check_food((select count(*)=1 and bool_and(status='active' and note='TEST note') from food_batches),'Admin safely reopens latest finish and removes only unreceived placeholder');
select pg_temp.deny_food('select food_finish(id,updated_at) from food_snapshot','P7002','Old finish form cannot re-finish reopened batch');
select food_correct(id,updated_at,'waiting',null,null,note,null) from food_batches where status='active';
select pg_temp.check_food((select status='waiting' and start_date is null from food_batches),'Admin corrects accidental receipt to waiting');
select food_receive(id,updated_at) from food_batches where status='waiting';
select food_finish(id,updated_at) from food_batches where status='active';
select food_receive(id,updated_at) from food_batches where status='waiting';
select pg_temp.deny_food($q$select food_correct(b.id,b.updated_at,'active',b.start_date,null,'',s.updated_at) from food_batches b join food_batches s on s.previous_batch_id=b.id where b.status='finished'$q$,'P7005','Cannot reopen old finish after successor received');
select pg_temp.deny_food($q$select food_correct(id,updated_at,'finished',null,now(),'',null) from food_batches where status='active'$q$,'P7004','Admin cannot use correction to bypass normal finish');
-- Swap positions in a single save, while B stays the active household.
select food_save_households((select jsonb_agg(to_jsonb(h)||jsonb_build_object('rotation_position',case when name='TEST A' then 2 when name='TEST C' then 0 else 1 end)) from food_households h));
select pg_temp.check_food((select household_id=(select id from food_households where name='TEST B') from food_batches where status='active'),'Reorder preserves active household');
select food_finish(id,updated_at) from food_batches where status='active';
select pg_temp.check_food((select household_id=(select id from food_households where name='TEST A') from food_batches where status='waiting'),'Next advancement uses updated order');
select food_receive(id,updated_at) from food_batches where status='waiting';
select food_finish(id,updated_at) from food_batches where status='active';
select pg_temp.check_food((select household_id=(select id from food_households where name='TEST C') from food_batches where status='waiting'),'Last position wraps to first enabled household');
select food_save_households((select jsonb_agg(to_jsonb(h)||jsonb_build_object('is_enabled',name<>'TEST B')) from food_households h));
select food_receive(id,updated_at) from food_batches where status='waiting';
select food_finish(id,updated_at) from food_batches where status='active';
select pg_temp.check_food((select household_id=(select id from food_households where name='TEST A') from food_batches where status='waiting'),'Disabled household skipped');
select food_save_households((select jsonb_agg(to_jsonb(h)||jsonb_build_object('is_enabled',name='TEST A','name',case when name='TEST B' then 'TEST B renamed' else name end)) from food_households h));
select pg_temp.check_food(exists(select 1 from food_batches b join food_households h on h.id=b.household_id where h.name='TEST B renamed' and not h.is_enabled and b.status='finished'),'Rename/disable keeps historical references');
select food_receive(id,updated_at) from food_batches where status='waiting';
select food_finish(id,updated_at) from food_batches where status='active';
select pg_temp.check_food((select household_id=(select id from food_households where name='TEST A') from food_batches where status='waiting'),'Only enabled household cycles back to itself');
select pg_temp.check_food((select count(*)=1 from food_batches where status in ('waiting','active')),'Exactly one unfinished batch after full cycle');
select pg_temp.deny_food($q$update food_batches set note='bypass'$q$,'42501','Even admin uses checked batch operations');
-- Corrupt configuration only as fixture owner to exercise rollback of finish on missing next household.
select food_receive(id,updated_at) from food_batches where status='waiting';
reset role;
update food_households set is_enabled=false;
set local role authenticated;
select pg_temp.deny_food($q$select food_finish(id,updated_at) from food_batches where status='active'$q$,'P7001','Missing next household rejects finish atomically');
select pg_temp.check_food((select count(*)=1 from food_batches where status='active'),'Failed finish keeps active batch instead of orphaning rotation');
reset role;
set local request.jwt.claim.sub='f7000000-0000-0000-0000-000000000006';
set local role authenticated;
select pg_temp.check_food((select count(*)=0 from food_batches),'Unknown Auth account cannot read batches');
select pg_temp.deny_food('select food_receive(null,null)','42501','Unknown Auth account cannot receive');
select pg_temp.deny_food('select food_finish(null,null)','42501','Unknown Auth account cannot finish');
reset role;
set local request.jwt.claim.sub='';
set local role anon;
select pg_temp.check_food((select count(*)=0 from food_households),'Anonymous cannot read food households');
select pg_temp.deny_food('select food_finish(null,null)','42501','Anonymous cannot execute food transitions');
reset role;
select * from food_results;
rollback;
