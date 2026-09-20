import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { addDays, mondayOf, vietnamToday } from "@/lib/date-format";
import type { HouseworkWeek, HouseworkMember, HouseworkCheckin } from "./rules";

export type HouseworkData = {
  week: string; today: string; members: HouseworkMember[]; weeks: HouseworkWeek[];
  checkins: HouseworkCheckin[]; error: string | null;
};

export async function getHousework(week: string, today = vietnamToday()): Promise<HouseworkData> {
  await requireProfile();
  const result: HouseworkData = { week, today, members: [], weeks: [], checkins: [], error: null };
  try {
    const db = await createClient();
    const current = mondayOf(today);
    // Current/next are ready for daily use. Selected future weeks are created on demand.
    for (const p_week of new Set([current, addDays(current, 7), week, addDays(week, 7)])) {
      const { error } = await db.rpc("housework_ensure_week", { p_week });
      if (error) throw error;
    }
    const [members, weeks, checkins] = await Promise.all([
      db.from("profiles").select("id, display_name, member_slot").order("member_slot"),
      db.from("housework_weeks").select("*").gte("week_start", week).lte("week_start", addDays(week, 7)).order("week_start"),
      db.from("housework_checkins").select("*").gte("date", week).lte("date", addDays(week, 6)).order("date"),
    ]);
    if (members.error || weeks.error || checkins.error) throw members.error ?? weeks.error ?? checkins.error;
    result.members = members.data;
    result.weeks = weeks.data;
    result.checkins = checkins.data;
  } catch {
    result.error = "Chưa tải được việc nhà. Kiểm tra kết nối rồi thử lại.";
  }
  return result;
}

export async function getHouseworkRotation(week: string) {
  await requireProfile();
  try {
    const db = await createClient();
    const { data, error } = await db.from("housework_rotations").select("id, effective_from")
      .lte("effective_from", week).order("effective_from", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
    if (!data) return { effective: null, order: [] as string[], error: null };
    const members = await db.from("housework_rotation_members").select("member_id")
      .eq("rotation_id", data.id).order("position");
    if (members.error) throw members.error;
    return { effective: data.effective_from, order: members.data.map(m => m.member_id), error: null };
  } catch {
    return { effective: null, order: [] as string[], error: "Chưa đọc được thứ tự luân phiên. Hãy tải lại." };
  }
}
