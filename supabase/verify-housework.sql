-- Read-only checks for the REAL family project after the Phase 6 migration.
-- Safe to run in SQL Editor. No fixtures, account creation or data changes.
select 'RLS: ' || tablename as check_name, rowsecurity as passed
from pg_tables where schemaname='public' and tablename in (
  'housework_rotations','housework_rotation_members','housework_weeks','housework_checkins'
)
union all
select 'RPC installed: ' || signature, to_regprocedure('public.' || signature) is not null
from unnest(array[
  'housework_save_rotation(date,uuid[])',
  'housework_ensure_week(date)',
  'housework_assign_week(date,uuid,timestamp with time zone)'
]) signature
union all
select 'Raw assignment writes restricted', not has_table_privilege('authenticated','public.housework_weeks','UPDATE')
union all
select 'Raw rotation writes restricted', not has_table_privilege('authenticated','public.housework_rotation_members','INSERT')
order by check_name;
