-- Disposable database ONLY, via test:db. Storage API itself requires remote smoke tests.
begin;
create temporary table profile_results(test text,result text);
grant select,insert on profile_results to authenticated,anon;
create function pg_temp.check_profile(ok boolean,label text) returns void language plpgsql as $$
begin
  if ok is not true then raise exception 'FAIL: %',label; end if;
  insert into profile_results values(label,'PASS');
end $$;
create function pg_temp.deny_profile(command text,expected text,label text) returns void language plpgsql as $$
declare rejected boolean:=false;
begin
  begin execute command;
  exception when others then if sqlstate<>expected then raise; end if; rejected:=true; end;
  perform pg_temp.check_profile(rejected,label);
end $$;
insert into auth.users(id) select ('f8000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
insert into public.profiles(id,display_name,role,member_slot)
select id,'TEST '||right(id::text,1),case when right(id::text,1)='1' then 'admin' else 'member' end::public.profile_role,
right(id::text,1)::int from auth.users where id::text like 'f800%' and right(id::text,1)::int<=5;
select pg_temp.check_profile((select not public and file_size_limit=524288 and allowed_mime_types=array['image/jpeg'] from storage.buckets where id='family-avatars'),'Avatar bucket is private, JPEG only and size limited');
set local request.jwt.claim.sub='f8000000-0000-0000-0000-000000000002';
set local role authenticated;
select pg_temp.check_profile((select profile_setup_at is null from profiles where id=auth.uid()),'New profile requires onboarding');
select save_my_profile('  Tên của tôi  ',null,(select updated_at from profiles where id=auth.uid()));
select pg_temp.check_profile((select display_name='Tên của tôi' and profile_setup_at is not null and avatar_path is null from profiles where id=auth.uid()),'Member can finish onboarding without photo');
select pg_temp.check_profile((select role='member' and member_slot=2 from profiles where id=auth.uid()),'Saving profile preserves identity role and slot');
select pg_temp.deny_profile($q$select save_my_profile(' ',null,(select updated_at from profiles where id=auth.uid()))$q$,'P8001','Blank name rejected');
select pg_temp.deny_profile($q$select save_my_profile(repeat('x',61),null,(select updated_at from profiles where id=auth.uid()))$q$,'P8001','Overlong name rejected');
update profiles set role='admin',member_slot=5 where id=auth.uid();
select pg_temp.check_profile((select role='member' and member_slot=2 from profiles where id=auth.uid()),'Member raw role/slot edit denied by RLS');
update profiles set display_name='Hacked' where member_slot=1;
select pg_temp.check_profile((select display_name='TEST 1' from profiles where member_slot=1),'Member cannot rename another person');
insert into storage.objects(bucket_id,name) values ('family-avatars','f8000000-0000-0000-0000-000000000002/11111111-1111-1111-1111-111111111111.jpg');
select pg_temp.check_profile((select count(*)=1 from storage.objects),'Member can upload in own folder');
select pg_temp.deny_profile($q$insert into storage.objects(bucket_id,name) values('family-avatars','f8000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg')$q$,'42501','Cannot upload into another member folder');
select pg_temp.deny_profile($q$select save_my_profile('New','f8000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg',(select updated_at from profiles where id=auth.uid()))$q$,'P8003','Cannot attach another member avatar');
select pg_temp.deny_profile($q$select save_my_profile('New','f8000000-0000-0000-0000-000000000002/22222222-2222-2222-2222-222222222222.jpg',(select updated_at from profiles where id=auth.uid()))$q$,'P8003','Cannot attach nonexistent avatar');
select save_my_profile('New','f8000000-0000-0000-0000-000000000002/11111111-1111-1111-1111-111111111111.jpg',(select updated_at from profiles where id=auth.uid()));
delete from storage.objects;
select pg_temp.check_profile((select count(*)=1 from storage.objects),'Cannot delete referenced avatar');
update storage.objects set name='replaced.jpg';
select pg_temp.check_profile((select name like '%111111111111.jpg' from storage.objects),'Cannot overwrite uploaded image');
select pg_temp.deny_profile($q$select save_my_profile('Stale',null,'2000-01-01T00:00:00Z')$q$,'P8002','Stale profile save rejected');
set local request.jwt.claim.sub='f8000000-0000-0000-0000-000000000003';
select pg_temp.check_profile((select count(*)=1 from storage.objects),'Other family member may read avatar');
delete from storage.objects;
select pg_temp.check_profile((select count(*)=1 from storage.objects),'Other member cannot delete avatar');
set local request.jwt.claim.sub='f8000000-0000-0000-0000-000000000002';
select save_my_profile('New',null,(select updated_at from profiles where id=auth.uid()));
delete from storage.objects;
select pg_temp.check_profile((select count(*)=0 from storage.objects),'Owner can remove unused photo after changing profile');
set local request.jwt.claim.sub='f8000000-0000-0000-0000-000000000006';
select pg_temp.check_profile((select count(*)=0 from profiles),'Unknown Auth account cannot read profiles');
select pg_temp.deny_profile($q$select save_my_profile('No',null,now())$q$,'42501','Unknown Auth account cannot save profile');
select pg_temp.deny_profile($q$insert into storage.objects(bucket_id,name) values('family-avatars','f8000000-0000-0000-0000-000000000006/11111111-1111-1111-1111-111111111111.jpg')$q$,'42501','Unknown Auth account cannot upload');
reset role;
insert into storage.objects(bucket_id,name) values('family-avatars','f8000000-0000-0000-0000-000000000001/11111111-1111-1111-1111-111111111111.jpg');
set local role authenticated;
select pg_temp.check_profile((select count(*)=0 from storage.objects),'Unknown Auth account cannot read stored image');
reset role;
set local request.jwt.claim.sub='';
set local role anon;
select pg_temp.check_profile((select count(*)=0 from storage.objects),'Anonymous cannot read stored image');
select pg_temp.deny_profile($q$select save_my_profile('No',null,now())$q$,'42501','Anonymous cannot save profile');
reset role;
select * from profile_results;
rollback;
