export type KitchenMember = { id: string; display_name: string; member_slot: number };
export type KitchenSlot = { weekday: number; duty_type: "cook" | "dishes"; slot_number: number; assigned_to: string };
export type KitchenDuty = {
  id: string; date: string; duty_type: "cook" | "dishes"; slot_number: number;
  assigned_to: string; delegated_to: string | null; completed_by: string | null;
  status: "unconfirmed" | "completed"; completed_at: string | null; updated_at: string;
};
export const ZONE = "Asia/Ho_Chi_Minh";
export function vietnamToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
export function addDays(date: string, days: number) {
  const value = new Date(date + "T00:00:00Z");
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function mondayOf(date: string) {
  const day = new Date(date + "T00:00:00Z").getUTCDay();
  return addDays(date, -((day + 6) % 7));
}
export function selectedWeek(value: unknown, today = vietnamToday()) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return mondayOf(today);
  const parsed = new Date(value + "T00:00:00Z");
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0,10) !== value ||
      value < "2000-01-01" || value > "2100-12-31") return mondayOf(today);
  return mondayOf(value);
}
export function dateText(date: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: ZONE, weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(date + "T00:00:00+07:00"));
}
export function timeText(at: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: ZONE, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(at));
}
export function blankSlots(): KitchenSlot[] {
  return Array.from({length: 5}, (_, d) => [
    { weekday: d+1, duty_type: "cook" as const, slot_number: 1, assigned_to: "" },
    { weekday: d+1, duty_type: "cook" as const, slot_number: 2, assigned_to: "" },
    { weekday: d+1, duty_type: "dishes" as const, slot_number: 1, assigned_to: "" },
  ]).flat();
}
export function validateSlots(slots: KitchenSlot[], members: KitchenMember[]) {
  if (members.length !== 5) return "Cần đủ 5 hồ sơ gia đình trước khi lưu lịch.";
  if (slots.length !== 15) return "Lịch phải có đủ 15 công.";
  const expected = blankSlots();
  if (expected.some(e => slots.filter(s => s.weekday === e.weekday && s.duty_type === e.duty_type && s.slot_number === e.slot_number).length !== 1))
    return "Mỗi ngày cần 2 công nấu và 1 công rửa, không trùng ô.";
  if (slots.some(s => !members.some(m => m.id === s.assigned_to))) return "Hãy chọn thành viên cho cả 15 công.";
  if (members.some(m => slots.filter(s => s.assigned_to === m.id).length !== 3)) return "Mỗi thành viên phải được phân công đúng 3 công.";
  return null;
}
export const responsibleId = (d: KitchenDuty) => d.delegated_to ?? d.assigned_to;
export const workloadLabel = (count: number) => count === 3 ? "Đủ" : count < 3 ? `Thiếu ${3-count}` : `Dư ${count-3}`;
export function weeklyCount(duties: KitchenDuty[], member: string, week: string) {
  return duties.filter(d => d.status === "completed" && d.completed_by === member && d.date >= week && d.date <= addDays(week,4)).length;
}
export const relatedDuties = (duties: KitchenDuty[], member: string) =>
  duties.filter(d => d.assigned_to === member || d.delegated_to === member || d.completed_by === member);

