-- Read-only: after BOTH migrations, expect 12 rows with rls_enabled = true.
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relkind='r'
  and c.relname in ('profiles','kitchen_templates','kitchen_template_slots','kitchen_duties',
    'dinner_plans','dinner_checkins','housework_rotations','housework_rotation_members',
    'housework_weeks','housework_checkins','food_households','food_batches')
order by table_name;

-- Check the three admin correction policies and today-only insert policies.
select tablename, policyname, roles, cmd, qual, with_check
from pg_policies where schemaname='public'
  and tablename in ('dinner_plans','dinner_checkins','housework_checkins')
order by tablename, policyname;
