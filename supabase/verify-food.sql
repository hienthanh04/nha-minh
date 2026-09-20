-- Read-only: safe for the family project after applying the Phase 7 migration.
select 'RLS: '||tablename as check_name, rowsecurity as passed
from pg_tables where schemaname='public' and tablename in ('food_households','food_batches')
union all
select 'RPC installed: '||signature, to_regprocedure('public.'||signature) is not null
from unnest(array[
  'food_save_households(jsonb)','food_initialize(uuid)',
  'food_receive(uuid,timestamp with time zone)','food_finish(uuid,timestamp with time zone)',
  'food_correct(uuid,timestamp with time zone,food_batch_status,date,timestamp with time zone,text,timestamp with time zone)'
]) signature
union all
select 'Raw household writes restricted', not has_table_privilege('authenticated','public.food_households','UPDATE')
union all
select 'Raw batch writes restricted', not has_table_privilege('authenticated','public.food_batches','UPDATE')
union all
select 'Finished date constraint installed', exists(select 1 from pg_constraint where conrelid='public.food_batches'::regclass and conname='food_finished_dates_valid' and convalidated)
order by check_name;
