import { validBusinessDate } from "../date-format.ts";
import type { Database } from "@/lib/supabase/database.types";

export type HouseworkWeek = Database["public"]["Tables"]["housework_weeks"]["Row"];
export type HouseworkCheckin = Database["public"]["Tables"]["housework_checkins"]["Row"];
export type HouseworkMember = { id: string; display_name: string; member_slot: number };

export const validHouseworkDate = validBusinessDate;

export function validateOrder(order: string[], members: HouseworkMember[]) {
  if (members.length !== 5 || order.length !== 5 || new Set(order).size !== 5 ||
    order.some(id => !members.some(member => member.id === id))) return "Chọn đủ 5 thành viên, mỗi người đúng một lần.";
  return null;
}

// Used for the admin preview. The database generates the actual stored assignment.
export function rotationPosition(startMonday: string, date: string) {
  const elapsedDays = (Date.parse(date + "T00:00:00Z") - Date.parse(startMonday + "T00:00:00Z")) / 86400000;
  return elapsedDays < 0 ? null : Math.floor(elapsedDays / 7) % 5;
}

export function houseworkStatus(at: string | null) {
  return at ? "Đã làm" : "Chưa xác nhận";
}
