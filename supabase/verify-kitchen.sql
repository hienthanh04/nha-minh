-- Read-only checks after applying Phase 4.
select proname,
  has_function_privilege('authenticated',p.oid,'execute') as family_can_call,
  has_function_privilege('anon',p.oid,'execute') as anonymous_can_call
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('kitchen_save_week','kitchen_save_template',
  'kitchen_ensure_week','kitchen_complete','kitchen_delegate','kitchen_correct')
order by proname;

-- These must all be false; checked RPCs perform kitchen mutations.
select name,
  has_table_privilege('authenticated','public.'||name,'INSERT') as direct_insert,
  has_table_privilege('authenticated','public.'||name,'UPDATE') as direct_update,
  has_table_privilege('authenticated','public.'||name,'DELETE') as direct_delete
from unnest(array['kitchen_duties','kitchen_templates','kitchen_template_slots']) name;

select count(*) as configured_members, count(*) filter(where role='admin') as admins from public.profiles;

-- No rows is expected before creating a schedule.
select date - (extract(isodow from date)::int-1) as week_start,
  assigned_to, count(*) as original_duties
from public.kitchen_duties group by 1,2 order by 1,2;

