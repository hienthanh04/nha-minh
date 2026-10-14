-- Run once in Supabase SQL Editor as the project owner.
-- Explicit family setup: promote the five EXISTING profiles, never Auth-only users.
begin;

do $$
begin
  if (select count(*) from public.profiles) <> 5 then
    raise exception 'Expected exactly 5 family profiles; no roles were changed.';
  end if;
end $$;

update public.profiles set role = 'admin' where role <> 'admin';

commit;

select member_slot, display_name, role
from public.profiles
order by member_slot;
