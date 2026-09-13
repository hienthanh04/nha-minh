-- Nhà Mình database foundation.
-- Run this migration in Supabase SQL Editor or with `supabase db push`.
-- No real family names or Auth IDs belong in this file.

create extension if not exists "pgcrypto";

create type public.profile_role as enum ('member', 'admin');
create type public.kitchen_duty_type as enum ('cook', 'dishes');
create type public.kitchen_duty_status as enum ('unconfirmed', 'completed');
create type public.dinner_plan as enum ('eating', 'not_eating');
create type public.food_batch_status as enum ('waiting', 'active', 'finished');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  role public.profile_role not null default 'member',
  member_slot smallint not null unique check (member_slot between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kitchen_templates (
  id uuid primary key default gen_random_uuid(),
  effective_from date not null unique check (extract(isodow from effective_from) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.kitchen_template_slots (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.kitchen_templates(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 5),
  duty_type public.kitchen_duty_type not null,
  slot_number smallint not null,
  assigned_to uuid not null references public.profiles(id),
  unique (template_id, weekday, duty_type, slot_number),
  check ((duty_type = 'cook' and slot_number between 1 and 2) or (duty_type = 'dishes' and slot_number = 1))
);

create table public.kitchen_duties (
  id uuid primary key default gen_random_uuid(),
  date date not null check (extract(isodow from date) between 1 and 5),
  duty_type public.kitchen_duty_type not null,
  slot_number smallint not null,
  assigned_to uuid not null references public.profiles(id),
  delegated_to uuid references public.profiles(id),
  completed_by uuid references public.profiles(id),
  status public.kitchen_duty_status not null default 'unconfirmed',
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (date, duty_type, slot_number),
  check ((duty_type = 'cook' and slot_number between 1 and 2) or (duty_type = 'dishes' and slot_number = 1)),
  check (delegated_to is null or delegated_to <> assigned_to),
  check ((status = 'completed' and completed_by is not null and completed_at is not null)
    or (status = 'unconfirmed' and completed_by is null and completed_at is null))
);

create index kitchen_duties_date_idx on public.kitchen_duties(date);
create index kitchen_duties_assigned_to_idx on public.kitchen_duties(assigned_to);
create index kitchen_duties_delegated_to_idx on public.kitchen_duties(delegated_to);
create index kitchen_duties_completed_by_idx on public.kitchen_duties(completed_by);

create table public.dinner_plans (
  member_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  plan public.dinner_plan not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (member_id, date)
);

create table public.dinner_checkins (
  member_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (member_id, date),
  foreign key (member_id, date) references public.dinner_plans(member_id, date) on delete restrict
);

create table public.housework_rotations (
  id uuid primary key default gen_random_uuid(),
  effective_from date not null unique check (extract(isodow from effective_from) = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.housework_rotation_members (
  rotation_id uuid not null references public.housework_rotations(id) on delete cascade,
  position smallint not null check (position between 0 and 4),
  member_id uuid not null references public.profiles(id),
  primary key (rotation_id, position),
  unique (rotation_id, member_id)
);

create table public.housework_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start date not null unique check (extract(isodow from week_start) = 1),
  responsible_member_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.housework_checkins (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete restrict,
  date date not null unique,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.food_households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  rotation_position integer not null unique check (rotation_position >= 0),
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.food_batches (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.food_households(id) on delete restrict,
  previous_batch_id uuid unique references public.food_batches(id) on delete restrict,
  status public.food_batch_status not null default 'waiting',
  start_date date,
  finished_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'waiting' and start_date is null and finished_at is null)
    or (status = 'active' and start_date is not null and finished_at is null)
    or (status = 'finished' and finished_at is not null))
);

create unique index one_unfinished_food_batch_idx on public.food_batches ((true))
  where status in ('waiting', 'active');
create index food_batches_household_idx on public.food_batches(household_id);
create index food_batches_status_idx on public.food_batches(status);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','kitchen_templates','kitchen_duties','dinner_plans','housework_rotations','housework_weeks','food_households','food_batches'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', table_name || '_updated_at', table_name);
  end loop;
end $$;

-- Small security helpers prevent repeating policy logic and avoid recursive profile policies.
create or replace function public.is_family_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid());
$$;

create or replace function public.is_family_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

revoke all on function public.is_family_member() from public;
revoke all on function public.is_family_admin() from public;
grant execute on function public.is_family_member() to authenticated;
grant execute on function public.is_family_admin() to authenticated;

create or replace function public.protect_last_admin()
returns trigger language plpgsql set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.role = 'admin') or (tg_op = 'UPDATE' and old.role = 'admin' and new.role <> 'admin') then
    if not exists (select 1 from public.profiles where role = 'admin' and id <> old.id) then
      raise exception 'The family must keep at least one admin';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger profiles_protect_last_admin
  before update or delete on public.profiles
  for each row execute function public.protect_last_admin();

-- Dinner check-ins require an eating plan. The composite FK also requires that a plan row exists.
create or replace function public.require_eating_dinner_plan()
returns trigger language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.dinner_plans
    where member_id = new.member_id and date = new.date and plan = 'eating'
  ) then
    raise exception 'A dinner check-in requires an eating plan';
  end if;
  return new;
end;
$$;
create trigger dinner_checkins_require_eating
  before insert or update on public.dinner_checkins
  for each row execute function public.require_eating_dinner_plan();

create or replace function public.keep_dinner_checkin_consistent()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.plan <> 'eating' and exists (
    select 1 from public.dinner_checkins where member_id = new.member_id and date = new.date
  ) then
    raise exception 'Remove the dinner check-in before changing the plan';
  end if;
  return new;
end;
$$;
create trigger dinner_plans_keep_checkin_consistent
  before update on public.dinner_plans
  for each row execute function public.keep_dinner_checkin_consistent();

-- A housework check-in must belong to the week's recorded responsible member.
create or replace function public.require_responsible_housework_member()
returns trigger language plpgsql set search_path = public as $$
declare expected_member uuid;
begin
  select responsible_member_id into expected_member
  from public.housework_weeks
  where week_start = (new.date - ((extract(isodow from new.date)::int) - 1));
  if expected_member is null or expected_member <> new.member_id then
    raise exception 'Only the responsible member may check in housework for this date';
  end if;
  return new;
end;
$$;
create trigger housework_checkins_require_responsible_member
  before insert or update on public.housework_checkins
  for each row execute function public.require_responsible_housework_member();

alter table public.profiles enable row level security;
alter table public.kitchen_templates enable row level security;
alter table public.kitchen_template_slots enable row level security;
alter table public.kitchen_duties enable row level security;
alter table public.dinner_plans enable row level security;
alter table public.dinner_checkins enable row level security;
alter table public.housework_rotations enable row level security;
alter table public.housework_rotation_members enable row level security;
alter table public.housework_weeks enable row level security;
alter table public.housework_checkins enable row level security;
alter table public.food_households enable row level security;
alter table public.food_batches enable row level security;

-- Family members can read coordination data; profile self-read is enough for future login bootstrap.
create policy profiles_family_read on public.profiles for select using (public.is_family_member());
create policy profiles_admin_write on public.profiles for all using (public.is_family_admin()) with check (public.is_family_admin());

create policy kitchen_templates_family_read on public.kitchen_templates for select using (public.is_family_member());
create policy kitchen_templates_admin_write on public.kitchen_templates for all using (public.is_family_admin()) with check (public.is_family_admin());
create policy kitchen_template_slots_family_read on public.kitchen_template_slots for select using (public.is_family_member());
create policy kitchen_template_slots_admin_write on public.kitchen_template_slots for all using (public.is_family_admin()) with check (public.is_family_admin());
create policy kitchen_duties_family_read on public.kitchen_duties for select using (public.is_family_member());
create policy kitchen_duties_admin_write on public.kitchen_duties for all using (public.is_family_admin()) with check (public.is_family_admin());

create policy dinner_plans_family_read on public.dinner_plans for select using (public.is_family_member());
create policy dinner_plans_own_write on public.dinner_plans for all using (member_id = auth.uid()) with check (member_id = auth.uid());
create policy dinner_checkins_family_read on public.dinner_checkins for select using (public.is_family_member());
create policy dinner_checkins_own_write on public.dinner_checkins for all using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy housework_rotations_family_read on public.housework_rotations for select using (public.is_family_member());
create policy housework_rotations_admin_write on public.housework_rotations for all using (public.is_family_admin()) with check (public.is_family_admin());
create policy housework_rotation_members_family_read on public.housework_rotation_members for select using (public.is_family_member());
create policy housework_rotation_members_admin_write on public.housework_rotation_members for all using (public.is_family_admin()) with check (public.is_family_admin());
create policy housework_weeks_family_read on public.housework_weeks for select using (public.is_family_member());
create policy housework_weeks_admin_write on public.housework_weeks for all using (public.is_family_admin()) with check (public.is_family_admin());
create policy housework_checkins_family_read on public.housework_checkins for select using (public.is_family_member());
create policy housework_checkins_own_write on public.housework_checkins for all using (member_id = auth.uid()) with check (member_id = auth.uid());

create policy food_households_family_read on public.food_households for select using (public.is_family_member());
create policy food_households_admin_write on public.food_households for all using (public.is_family_admin()) with check (public.is_family_admin());
create policy food_batches_family_read on public.food_batches for select using (public.is_family_member());
-- State transitions will use checked feature operations in a later phase; raw batch writes stay admin-only here.
create policy food_batches_admin_write on public.food_batches for all using (public.is_family_admin()) with check (public.is_family_admin());

-- Keep direct table access explicit for the API roles. RLS still applies to every row.
grant select on all tables in schema public to authenticated;
grant insert, update, delete on public.dinner_plans, public.dinner_checkins, public.housework_checkins to authenticated;
grant insert, update, delete on public.profiles, public.kitchen_templates, public.kitchen_template_slots,
  public.kitchen_duties, public.housework_rotations, public.housework_rotation_members,
  public.housework_weeks, public.food_households, public.food_batches to authenticated;
