import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/session";
import { addDays, mondayOf, vietnamToday, type KitchenDuty, type KitchenMember, type KitchenSlot } from "./rules";

export type KitchenWeek = { week: string; today: string; duties: KitchenDuty[]; members: KitchenMember[]; error: string | null };
export async function getKitchenWeek(week: string): Promise<KitchenWeek> {
  await requireProfile();
  const today = vietnamToday();
  const result: KitchenWeek = { week, today, duties: [], members: [], error: null };
  try {
    const db = await createClient();
    const weeks = [...new Set([mondayOf(today), addDays(mondayOf(today), 7), week])];
    for (const p_week of weeks) {
      const { error } = await db.rpc("kitchen_ensure_week", { p_week });
      if (error) throw error;
    }
    const [duties, members] = await Promise.all([
      db.from("kitchen_duties").select("*").gte("date", week).lte("date", addDays(week,4)).order("date").order("duty_type").order("slot_number"),
      db.from("profiles").select("id, display_name, member_slot").order("member_slot"),
    ]);
    if (duties.error || members.error) throw duties.error ?? members.error;
    result.duties = duties.data;
    result.members = members.data;
    if (result.duties.length && result.duties.length !== 15) result.error = "Lịch tuần chưa đủ 15 công. Hãy nhờ quản trị viên kiểm tra.";
  } catch {
    result.error = "Chưa tải được lịch bếp. Kiểm tra kết nối và bảo đảm đã chạy migration Phase 4, rồi tải lại.";
  }
  return result;
}

export async function getKitchenTemplate(week: string): Promise<{ slots: KitchenSlot[]; effective: string | null; error: string | null }> {
  await requireProfile();
  try {
    const db = await createClient();
    const {data, error} = await db.from("kitchen_templates").select("id, effective_from").lte("effective_from", week).order("effective_from", {ascending:false}).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return { slots: [], effective: null, error: null };
    const slots = await db.from("kitchen_template_slots").select("weekday, duty_type, slot_number, assigned_to").eq("template_id", data.id).order("weekday").order("duty_type").order("slot_number");
    if (slots.error) throw slots.error;
    return {slots: slots.data, effective: data.effective_from, error:null};
  } catch { return {slots:[], effective:null, error:"Chưa đọc được lịch mẫu. Hãy tải lại."}; }
}

