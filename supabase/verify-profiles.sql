-- Read-only. Safe to run in the family project after the new migration.
select 'avatar_path column' as check_name, exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='avatar_path') as passed
union all select 'onboarding column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='profile_setup_at')
union all select 'private JPEG bucket', exists(select 1 from storage.buckets where id='family-avatars' and not public and file_size_limit=524288 and allowed_mime_types=array['image/jpeg'])
union all select 'profile RPC', to_regprocedure('public.save_my_profile(text,text,timestamptz)') is not null
union all select 'three avatar policies', (select count(*)=3 from pg_policies where schemaname='storage' and tablename='objects' and policyname in ('family_avatars_read','family_avatars_insert','family_avatars_delete'))
union all select 'profiles RLS', (select relrowsecurity from pg_class where oid='public.profiles'::regclass);
