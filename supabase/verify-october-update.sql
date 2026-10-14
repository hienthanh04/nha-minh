-- Read-only; safe for the real family database. All five rows should be true.
select 'Default dinner trigger installed' as check_name,
  coalesce(position('2026-10-14' in pg_get_functiondef(to_regprocedure('public.require_eating_dinner_plan()')))>0,false) as passed
union all select 'Dinner writes still use caller RLS',
  exists(select 1 from pg_proc where oid=to_regprocedure('public.require_eating_dinner_plan()') and not prosecdef)
union all select 'Family may configure housework',
  coalesce(position('is_family_member()' in pg_get_functiondef(to_regprocedure('public.housework_save_rotation(date,uuid[])')))>0,false)
union all select 'Family may assign housework',
  coalesce(position('is_family_member()' in pg_get_functiondef(to_regprocedure('public.housework_assign_week(date,uuid,timestamptz)')))>0,false)
union all select 'Family may correct housework',
  coalesce(position('is_family_member()' in pg_get_functiondef(to_regprocedure('public.housework_correct(date,timestamptz,timestamptz)')))>0,false);
