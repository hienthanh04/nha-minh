import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { vietnamToday } from "@/lib/kitchen/rules";
import type { DinnerCheckin, DinnerMember, DinnerPlanRow } from "./rules";
export type DinnerData = {
  today:string; from:string; to:string; members:DinnerMember[];
  plans:DinnerPlanRow[]; checkins:DinnerCheckin[]; error:string | null;
};
export async function getDinner(from:string, to:string): Promise<DinnerData> {
  await requireProfile();
  const result:DinnerData = {today:vietnamToday(),from,to,members:[],plans:[],checkins:[],error:null};
  try {
    const db=await createClient();
    const [members,plans,checkins]=await Promise.all([
      db.from("profiles").select("id, display_name, member_slot").order("member_slot"),
      db.from("dinner_plans").select("member_id, date, plan").gte("date",from).lte("date",to),
      db.from("dinner_checkins").select("member_id, date, completed_at").gte("date",from).lte("date",to),
    ]);
    if (members.error || plans.error || checkins.error) throw new Error("Dinner read failed");
    result.members=members.data;
    result.plans=plans.data;
    result.checkins=checkins.data;
    if (!result.members.length) result.error="Chưa có hồ sơ gia đình. Hãy nhờ quản trị viên kiểm tra.";
  } catch {
    result.error="Chưa tải được bữa tối. Kiểm tra kết nối rồi thử tải lại.";
  }
  return result;
}
