-- Phase 4: narrow kitchen operations; existing rows/tables are retained.
-- Apply after the two Phase 2 migrations. No production setup data.
-- Supabase API callers use these transactions instead of unrestricted writes.
revoke insert, update, delete on public.kitchen_duties, public.kitchen_templates,
  public.kitchen_template_slots from authenticated, anon;

-- A changing row timestamp allows stale delegation/correction forms to fail safely.
create function public.kitchen_touch()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
drop trigger kitchen_duties_updated_at on public.kitchen_duties;
create trigger kitchen_duties_updated_at before update on public.kitchen_duties
  for each row execute function public.kitchen_touch();
revoke all on function public.kitchen_touch() from public, anon, authenticated;

create function public.kitchen_validate_slots(p_slots jsonb)
returns void language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.profiles) <> 5 then
    raise exception 'Cần đủ 5 hồ sơ gia đình trước khi lưu lịch.';
  end if;
  if jsonb_typeof(p_slots) is distinct from 'array' or jsonb_array_length(p_slots) <> 15 then
    raise exception 'Lịch phải có đủ 15 công.';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_slots) as s(weekday int, duty_type text, slot_number int, assigned_to uuid)
    where weekday is null or weekday not between 1 and 5
      or duty_type is null or slot_number is null
      or not ((duty_type = 'cook' and slot_number in (1,2)) or (duty_type = 'dishes' and slot_number = 1))
      or assigned_to is null or not exists (select 1 from public.profiles p where p.id = s.assigned_to)
  ) or (select count(distinct (weekday, duty_type, slot_number))
    from jsonb_to_recordset(p_slots) as s(weekday int, duty_type text, slot_number int, assigned_to uuid)) <> 15 then
    raise exception 'Mỗi ngày cần 2 công nấu và 1 công rửa, không trùng ô.';
  end if;
  if exists (select assigned_to from jsonb_to_recordset(p_slots)
    as s(weekday int, duty_type text, slot_number int, assigned_to uuid)
    group by assigned_to having count(*) <> 3) then
    raise exception 'Mỗi thành viên phải được phân công đúng 3 công.';
  end if;
end;
$$;

create function public.kitchen_save_week(p_week date, p_slots jsonb, p_correct_past boolean default false)
returns void language plpgsql security definer set search_path = public as $$
declare affected integer; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.is_family_admin() then raise exception 'Chỉ quản trị viên được sửa lịch.' using errcode = '42501'; end if;
  if p_week is null or extract(isodow from p_week) <> 1 then raise exception 'Hãy chọn ngày thứ Hai.'; end if;
  if p_week < today - (extract(isodow from today)::int - 1) and not coalesce(p_correct_past, false) then
    raise exception 'Cần xác nhận chỉnh sửa lịch quá khứ.';
  end if;
  perform public.kitchen_validate_slots(p_slots);
  -- Lock only this week's existing rows. A completion/delegation cannot be lost.
  perform 1 from public.kitchen_duties where date between p_week and p_week + 4 order by date, duty_type, slot_number for update;
  if exists (select 1 from public.kitchen_duties where date between p_week and p_week + 4
    and (status = 'completed' or delegated_to is not null)) then
    raise exception 'Tuần đã có xác nhận hoặc nhờ làm hộ. Hãy sửa từng công trong chi tiết.';
  end if;
  insert into public.kitchen_duties (date, duty_type, slot_number, assigned_to)
    select p_week + weekday - 1, duty_type::public.kitchen_duty_type, slot_number, assigned_to
    from jsonb_to_recordset(p_slots) as s(weekday int, duty_type text, slot_number int, assigned_to uuid)
    order by weekday, duty_type, slot_number
  on conflict (date, duty_type, slot_number) do update set assigned_to = excluded.assigned_to
    where kitchen_duties.status = 'unconfirmed' and kitchen_duties.delegated_to is null;
  get diagnostics affected = row_count;
  if affected <> 15 then raise exception 'Lịch vừa thay đổi. Tải lại trước khi lưu.'; end if;
end;
$$;

-- Existing materialized weeks are preserved, including admin exceptions.
-- Only not-yet-created weeks use the newest effective template.
create function public.kitchen_save_template(p_week date, p_slots jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare template uuid; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; monday date;
begin
  if not public.is_family_admin() then raise exception 'Chỉ quản trị viên được sửa lịch mẫu.' using errcode = '42501'; end if;
  monday := today - (extract(isodow from today)::int - 1);
  if p_week is null or extract(isodow from p_week) <> 1 then raise exception 'Hãy chọn ngày thứ Hai.'; end if;
  if p_week < monday or (p_week <= monday and exists(select 1 from public.kitchen_templates)) then
    raise exception 'Thay đổi lịch mẫu áp dụng từ thứ Hai của tuần tương lai.';
  end if;
  perform public.kitchen_validate_slots(p_slots);
  insert into public.kitchen_templates(effective_from) values(p_week)
    on conflict(effective_from) do update set effective_from = excluded.effective_from
    returning id into template;
  delete from public.kitchen_template_slots where template_id = template;
  insert into public.kitchen_template_slots(template_id, weekday, duty_type, slot_number, assigned_to)
    select template, weekday, duty_type::public.kitchen_duty_type, slot_number, assigned_to
    from jsonb_to_recordset(p_slots) as s(weekday int, duty_type text, slot_number int, assigned_to uuid);
end;
$$;

create function public.kitchen_ensure_week(p_week date)
returns void language plpgsql security definer set search_path = public as $$
declare template uuid; today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  if not public.is_family_member() then raise exception 'Bạn chưa có quyền truy cập.' using errcode = '42501'; end if;
  if p_week is null or extract(isodow from p_week) <> 1 then raise exception 'Hãy chọn ngày thứ Hai.'; end if;
  -- Viewing history never manufactures historical responsibilities.
  if p_week < today - (extract(isodow from today)::int - 1) then return; end if;
  if exists (select 1 from public.kitchen_duties where date between p_week and p_week + 4) then return; end if;
  select id into template from public.kitchen_templates where effective_from <= p_week
    order by effective_from desc limit 1 for share;
  if template is null then return; end if;
  insert into public.kitchen_duties(date, duty_type, slot_number, assigned_to)
    select p_week + weekday - 1, duty_type, slot_number, assigned_to
    from public.kitchen_template_slots where template_id = template
    order by weekday, duty_type, slot_number
    on conflict(date, duty_type, slot_number) do nothing;
end;
$$;

create function public.kitchen_complete(p_id uuid)
returns public.kitchen_duties language plpgsql security definer set search_path = public as $$
declare result public.kitchen_duties;
begin
  if not public.is_family_member() then raise exception 'Bạn chưa có quyền truy cập.' using errcode = '42501'; end if;
  update public.kitchen_duties set status = 'completed', completed_by = auth.uid(), completed_at = clock_timestamp()
    where id = p_id and status = 'unconfirmed'
      and coalesce(delegated_to, assigned_to) = auth.uid()
      and date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date
    returning * into result;
  if not found then
    raise exception 'Không thể xác nhận: công đã đổi, đã hoàn thành, chưa tới ngày hoặc không thuộc trách nhiệm của bạn.';
  end if;
  return result;
end;
$$;

create function public.kitchen_delegate(p_id uuid, p_member uuid, p_expected timestamptz)
returns public.kitchen_duties language plpgsql security definer set search_path = public as $$
declare result public.kitchen_duties;
begin
  if not public.is_family_member() then raise exception 'Bạn chưa có quyền truy cập.' using errcode = '42501'; end if;
  if p_member = auth.uid() or (p_member is not null and not exists(select 1 from public.profiles where id = p_member)) then
    raise exception 'Hãy chọn một thành viên khác trong gia đình.';
  end if;
  update public.kitchen_duties set delegated_to = p_member
    where id = p_id and assigned_to = auth.uid() and status = 'unconfirmed' and updated_at = p_expected
    returning * into result;
  if not found then raise exception 'Chỉ người được phân công gốc được đổi nhờ làm hộ trước khi hoàn thành. Hãy tải lại công.'; end if;
  return result;
end;
$$;

create function public.kitchen_correct(p_id uuid, p_expected timestamptz, p_member uuid, p_at timestamptz)
returns public.kitchen_duties language plpgsql security definer set search_path = public as $$
declare result public.kitchen_duties;
begin
  if not public.is_family_admin() then raise exception 'Chỉ quản trị viên được sửa xác nhận.' using errcode = '42501'; end if;
  if (p_member is null) <> (p_at is null) or p_at > now() then
    raise exception 'Chọn người thực hiện và thời điểm hợp lệ, hoặc bỏ cả hai để về Chưa xác nhận.';
  end if;
  update public.kitchen_duties set completed_by = p_member, completed_at = p_at,
    status = case when p_member is null then 'unconfirmed'::public.kitchen_duty_status else 'completed'::public.kitchen_duty_status end
    where id = p_id and updated_at = p_expected
      and (p_member is null or date <= (now() at time zone 'Asia/Ho_Chi_Minh')::date)
    returning * into result;
  if not found then raise exception 'Công vừa thay đổi hoặc chưa tới ngày. Tải lại trước khi sửa.'; end if;
  return result;
end;
$$;

revoke all on function public.kitchen_validate_slots(jsonb) from public, anon, authenticated;
revoke all on function public.kitchen_save_week(date,jsonb,boolean) from public, anon, authenticated;
revoke all on function public.kitchen_save_template(date,jsonb) from public, anon, authenticated;
revoke all on function public.kitchen_ensure_week(date) from public, anon, authenticated;
revoke all on function public.kitchen_complete(uuid) from public, anon, authenticated;
revoke all on function public.kitchen_delegate(uuid,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.kitchen_correct(uuid,timestamptz,uuid,timestamptz) from public, anon, authenticated;
grant execute on function public.kitchen_save_week(date,jsonb,boolean), public.kitchen_save_template(date,jsonb),
  public.kitchen_ensure_week(date), public.kitchen_complete(uuid),
  public.kitchen_delegate(uuid,uuid,timestamptz), public.kitchen_correct(uuid,timestamptz,uuid,timestamptz) to authenticated;
