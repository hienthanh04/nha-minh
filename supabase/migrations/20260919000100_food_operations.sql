-- Phase 7: keep existing tables/history. Run once inside BEGIN; ... COMMIT;.
revoke insert, update, delete on public.food_households, public.food_batches from authenticated, anon;

-- Reordering can swap two positions within one transaction, while retaining uniqueness.
alter table public.food_households drop constraint food_households_rotation_position_key;
alter table public.food_households add constraint food_households_rotation_position_key
  unique(rotation_position) deferrable initially immediate;
-- The old check allowed finished batches with no receipt date. Do not silently repair old data.
alter table public.food_batches add constraint food_finished_dates_valid check (
  status <> 'finished' or (start_date is not null and start_date <= (finished_at at time zone 'Asia/Ho_Chi_Minh')::date)
);

create function public.food_touch()
returns trigger language plpgsql set search_path=public as $$
begin
  new.updated_at := greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
  return new;
end $$;
drop trigger food_households_updated_at on public.food_households;
drop trigger food_batches_updated_at on public.food_batches;
create trigger food_households_updated_at before update on public.food_households for each row execute function public.food_touch();
create trigger food_batches_updated_at before update on public.food_batches for each row execute function public.food_touch();
revoke all on function public.food_touch() from public,anon,authenticated;

create function public.food_save_households(p_items jsonb)
returns void language plpgsql security definer set search_path=public as $$
declare item record;
begin
  if not public.is_family_admin() then raise exception 'Admin only' using errcode='42501'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items)=0 then
    raise exception 'Households required' using errcode='P7001';
  end if;
  -- Only the small configuration is locked while saving a complete edited list.
  perform 1 from public.food_households order by id for update;
  if exists(select 1 from jsonb_to_recordset(p_items) as x(id uuid,name text,rotation_position int,is_enabled boolean,updated_at timestamptz)
    where name is null or length(trim(name))=0 or length(name)>100 or rotation_position is null or rotation_position<0 or is_enabled is null)
    or (select count(distinct rotation_position) from jsonb_to_recordset(p_items) as x(rotation_position int))<>jsonb_array_length(p_items)
    or not exists(select 1 from jsonb_to_recordset(p_items) as x(is_enabled boolean) where is_enabled) then
    raise exception 'Names, unique positions and at least one enabled household required' using errcode='P7001';
  end if;
  if exists(select 1 from public.food_households h where
    (select count(*) from jsonb_to_recordset(p_items) as x(id uuid,updated_at timestamptz) where x.id=h.id and x.updated_at=h.updated_at)<>1)
    or exists(select 1 from jsonb_to_recordset(p_items) as x(id uuid) where id is not null and not exists(select 1 from public.food_households h where h.id=x.id)) then
    raise exception 'Configuration changed; reload. Disable instead of deleting.' using errcode='P7002';
  end if;
  set constraints food_households_rotation_position_key deferred;
  for item in select * from jsonb_to_recordset(p_items) as x(id uuid,name text,rotation_position int,is_enabled boolean) loop
    if item.id is null then
      insert into public.food_households(name,rotation_position,is_enabled) values(trim(item.name),item.rotation_position,item.is_enabled);
    else
      update public.food_households set name=trim(item.name),rotation_position=item.rotation_position,is_enabled=item.is_enabled where id=item.id;
    end if;
  end loop;
  set constraints food_households_rotation_position_key immediate;
end $$;

create function public.food_initialize(p_household uuid)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_family_admin() then raise exception 'Admin only' using errcode='42501'; end if;
  if exists(select 1 from public.food_batches) then raise exception 'Already initialized' using errcode='P7003'; end if;
  if not exists(select 1 from public.food_households where id=p_household and is_enabled) then raise exception 'Enabled household required' using errcode='P7001'; end if;
  insert into public.food_batches(household_id,status) values(p_household,'waiting');
end $$;

create function public.food_receive(p_id uuid,p_expected timestamptz)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.is_family_member() then raise exception 'Family only' using errcode='42501'; end if;
  update public.food_batches set status='active',start_date=(now() at time zone 'Asia/Ho_Chi_Minh')::date
    where id=p_id and status='waiting' and updated_at=p_expected;
  if not found then raise exception 'Batch changed; reload' using errcode='P7002'; end if;
end $$;

create function public.food_finish(p_id uuid,p_expected timestamptz)
returns void language plpgsql security definer set search_path=public as $$
declare batch public.food_batches; next_household uuid;
begin
  if not public.is_family_member() then raise exception 'Family only' using errcode='42501'; end if;
  -- Conditional UPDATE takes the row lock. A retry cannot finish twice or create another successor.
  update public.food_batches set status='finished',finished_at=now()
    where id=p_id and status='active' and updated_at=p_expected returning * into batch;
  if not found then raise exception 'Batch changed; reload' using errcode='P7002'; end if;
  select h.id into next_household from public.food_households h
    where h.is_enabled
    order by (h.rotation_position > (select rotation_position from public.food_households where id=batch.household_id)) desc,
      h.rotation_position limit 1;
  if next_household is null then raise exception 'No enabled next household' using errcode='P7001'; end if;
  insert into public.food_batches(household_id,previous_batch_id,status) values(next_household,batch.id,'waiting');
  -- Both writes roll back together on any error. Existing unique indexes enforce one live batch/successor.
end $$;

-- Explicit admin correction. Never rewind across a successor that was already received.
create function public.food_correct(p_id uuid,p_expected timestamptz,p_status public.food_batch_status,
  p_start date,p_finished timestamptz,p_note text,p_successor_expected timestamptz default null)
returns void language plpgsql security definer set search_path=public as $$
declare batch public.food_batches; successor public.food_batches; today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.is_family_admin() then raise exception 'Admin only' using errcode='42501'; end if;
  select * into batch from public.food_batches where id=p_id for update;
  if not found or p_expected is null or batch.updated_at<>p_expected then raise exception 'Batch changed; reload' using errcode='P7002'; end if;
  if p_status is null or length(coalesce(p_note,''))>500 or
    (p_status='waiting' and (p_start is not null or p_finished is not null)) or
    (p_status='active' and (p_start is null or p_start>today or p_finished is not null)) or
    (p_status='finished' and (p_start is null or p_finished is null or p_finished>now() or p_start>(p_finished at time zone 'Asia/Ho_Chi_Minh')::date)) then
    raise exception 'Invalid correction dates' using errcode='P7004';
  end if;
  if p_status<>batch.status then
    if batch.status='active' and p_status='waiting' then
      null; -- Explicit correction of accidental receipt of the current batch.
    elsif batch.status='finished' and p_status='active' then
      select * into successor from public.food_batches where previous_batch_id=batch.id for update;
      if not found or successor.status<>'waiting' or p_successor_expected is null or successor.updated_at<>p_successor_expected then
        raise exception 'Successor already changed; cannot reopen' using errcode='P7005';
      end if;
      -- Only this unreceived waiting placeholder is removed, never a received/historical batch.
      delete from public.food_batches where id=successor.id;
    else
      raise exception 'Use normal receive/finish actions' using errcode='P7004';
    end if;
  end if;
  update public.food_batches set status=p_status,start_date=p_start,finished_at=p_finished,note=nullif(trim(p_note),'') where id=p_id;
end $$;

revoke all on function public.food_save_households(jsonb) from public,anon;
revoke all on function public.food_initialize(uuid) from public,anon;
revoke all on function public.food_receive(uuid,timestamptz) from public,anon;
revoke all on function public.food_finish(uuid,timestamptz) from public,anon;
revoke all on function public.food_correct(uuid,timestamptz,public.food_batch_status,date,timestamptz,text,timestamptz) from public,anon;
grant execute on function public.food_save_households(jsonb) to authenticated;
grant execute on function public.food_initialize(uuid) to authenticated;
grant execute on function public.food_receive(uuid,timestamptz) to authenticated;
grant execute on function public.food_finish(uuid,timestamptz) to authenticated;
grant execute on function public.food_correct(uuid,timestamptz,public.food_batch_status,date,timestamptz,text,timestamptz) to authenticated;
