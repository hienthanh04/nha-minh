import { validBusinessDate } from "../date-format.ts";
export type DinnerPlan = "unknown" | "eating" | "not_eating";
export type DinnerMember = { avatar_path?: string | null; id: string; display_name: string; member_slot: number };
export type DinnerPlanRow = { member_id: string; date: string; plan: "eating" | "not_eating" };
export type DinnerCheckin = { member_id: string; date: string; completed_at: string };
export function dinnerStatus(plan: DinnerPlan, completedAt: string | null) {
  if (plan === "eating" && completedAt) return { label:"Đã ăn", icon:"✅", tone:"success" };
  if (plan === "eating") return { label:"Có ăn • Chưa ăn", icon:"🍚", tone:"warm" };
  if (plan === "not_eating") return { label:"Không ăn", icon:"❌", tone:"muted" };
  return { label:"Chưa báo", icon:"❓", tone:"muted" };
}
export function dinnerFor(member: string, date: string, plans: DinnerPlanRow[], checkins: DinnerCheckin[]) {
  const plan: DinnerPlan = plans.find(p => p.member_id === member && p.date === date)?.plan ?? "unknown";
  const at = checkins.find(c => c.member_id === member && c.date === date)?.completed_at ?? null;
  return { plan, at };
}
export const validDinnerDate = validBusinessDate;
export function validPlan(plan: unknown): plan is DinnerPlan {
  return plan === "unknown" || plan === "eating" || plan === "not_eating";
}
export function mayChangePlan(date: string, today: string, admin = false) {
  return validDinnerDate(date) && (admin || date >= today);
}
