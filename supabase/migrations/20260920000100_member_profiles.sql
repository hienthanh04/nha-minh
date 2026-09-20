-- Profile onboarding and private avatars. Apply once after all previous migrations.
begin;
alter table public.profiles add column avatar_path text;
alter table public.profiles add column profile_setup_at timestamptz;
create function public.profile_touch() returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at := greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
  return new;
end $$;
drop trigger profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute function public.profile_touch();
revoke all on function public.profile_touch() from public,anon,authenticated;
alter table public.profiles add constraint profiles_avatar_path_valid check (
  avatar_path is null or avatar_path ~ ('^' || id::text || '/[0-9a-f-]{36}\.jpg$')
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('family-avatars','family-avatars',false,524288,array['image/jpeg']);

create policy family_avatars_read on storage.objects for select to authenticated
using (bucket_id='family-avatars' and public.is_family_member());
create policy family_avatars_insert on storage.objects for insert to authenticated
with check (bucket_id='family-avatars' and public.is_family_member()
  and name ~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.jpg$'));
-- Objects are immutable. Delete only your unused images, never somebody else's or the live avatar.
create policy family_avatars_delete on storage.objects for delete to authenticated
using (bucket_id='family-avatars' and public.is_family_member()
  and split_part(name,'/',1)=auth.uid()::text
  and not exists(select 1 from public.profiles p where p.avatar_path=storage.objects.name));

create function public.save_my_profile(p_name text,p_avatar text,p_expected timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare current_profile public.profiles;
begin
  if not public.is_family_member() then raise exception 'Family only' using errcode='42501'; end if;
  if p_name is null or length(trim(p_name)) not between 1 and 60 then
    raise exception 'Name must contain 1 to 60 characters' using errcode='P8001';
  end if;
  select * into current_profile from public.profiles where id=auth.uid() for update;
  if p_expected is null or current_profile.updated_at<>p_expected then
    raise exception 'Profile changed; reload first' using errcode='P8002';
  end if;
  if p_avatar is not null and (
    p_avatar !~ ('^' || auth.uid()::text || '/[0-9a-f-]{36}\.jpg$') or
    not exists(select 1 from storage.objects where bucket_id='family-avatars' and name=p_avatar)
  ) then raise exception 'Invalid avatar' using errcode='P8003'; end if;
  update public.profiles set display_name=trim(p_name),avatar_path=p_avatar,
    profile_setup_at=coalesce(profile_setup_at,clock_timestamp()) where id=auth.uid();
end $$;
revoke all on function public.save_my_profile(text,text,timestamptz) from public,anon;
grant execute on function public.save_my_profile(text,text,timestamptz) to authenticated;
-- Existing raw profile policies remain admin-only. Members cannot change role/id/slot.
commit;
