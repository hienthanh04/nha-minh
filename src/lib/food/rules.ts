import type { Database } from "@/lib/supabase/database.types";

export type FoodHousehold = Database["public"]["Tables"]["food_households"]["Row"];
export type FoodBatch = Database["public"]["Tables"]["food_batches"]["Row"];
export type HouseholdInput = { id: string | null; name: string; rotation_position: number; is_enabled: boolean; updated_at: string | null };

export function nextHousehold(households: FoodHousehold[], currentId: string) {
  const current = households.find(h => h.id === currentId);
  if (!current) return null;
  const enabled = households.filter(h => h.is_enabled).sort((a, b) => a.rotation_position - b.rotation_position);
  return enabled.find(h => h.rotation_position > current.rotation_position) ?? enabled[0] ?? null;
}
export function foodStatus(status: FoodBatch["status"]) {
  return status === "waiting" ? "Đang chờ" : status === "active" ? "Đang dùng" : "Đã hết";
}
export function validateHouseholds(items: HouseholdInput[]) {
  if (!items.length || !items.some(h => h.is_enabled)) return "Cần ít nhất một nhà đang tham gia gửi đồ.";
  if (items.some(h => !h.name.trim() || h.name.length > 100 || !Number.isInteger(h.rotation_position) || h.rotation_position < 0)) return "Điền tên (tối đa 100 ký tự) và thứ tự nguyên từ 1 trở lên.";
  if (new Set(items.map(h => h.rotation_position)).size !== items.length) return "Thứ tự không được trùng nhau, kể cả nhà đang tắt lượt.";
  return null;
}
export function foodPage(value: unknown) {
  const page = typeof value === "string" ? Number(value) : 0;
  return Number.isSafeInteger(page) && page >= 0 && page <= 10000 ? page : 0;
}
