import "server-only";
import { requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { FoodHousehold, FoodBatch } from "./rules";

export type FoodData = { households: FoodHousehold[]; current: FoodBatch | null; batches: FoodBatch[]; page: number; hasMore: boolean; error: string | null };
export async function getFood(page = 0): Promise<FoodData> {
  await requireProfile();
  const result: FoodData = { households: [], current: null, batches: [], page, hasMore: false, error: null };
  try {
    const db = await createClient();
    const [households, current, history] = await Promise.all([
      db.from("food_households").select("*").order("rotation_position"),
      db.from("food_batches").select("*").in("status", ["waiting", "active"]).maybeSingle(),
      db.from("food_batches").select("*").order("created_at", { ascending: false }).order("id").range(page * 20, page * 20 + 20),
    ]);
    if (households.error || current.error || history.error) throw households.error ?? current.error ?? history.error;
    result.households = households.data;
    result.current = current.data;
    result.batches = history.data.slice(0, 20);
    result.hasMore = history.data.length > 20;
  } catch {
    result.error = "Chưa tải được lượt gửi đồ ăn. Kiểm tra kết nối rồi tải lại.";
  }
  return result;
}
