-- Read-only verification, safe for the real family project.
select 'Family rotation permission' as check_name,
  position('is_family_member()' in pg_get_functiondef('public.housework_save_rotation(date,uuid[])'::regprocedure))>0 as passed
union all select 'Family assignment permission',
  position('is_family_member()' in pg_get_functiondef('public.housework_assign_week(date,uuid,timestamptz)'::regprocedure))>0
union all select 'Family correction installed',
  to_regprocedure('public.housework_correct(date,timestamptz,timestamptz)') is not null
union all select 'Housework RLS enabled',
  (select count(*)=4 and bool_and(rowsecurity) from pg_tables where schemaname='public'
   and tablename in ('housework_rotations','housework_rotation_members','housework_weeks','housework_checkins'))
union all select 'Raw assignment writes still restricted',
  not has_table_privilege('authenticated','public.housework_weeks','UPDATE');
