"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { type KitchenSlot } from "./rules";

export type KitchenResult = { ok: boolean; message: string };
function refreshKitchen() {
  for (const path of ["/", "/lich", "/lich-su", "/khac/quan-tri"]) revalidatePath(path);
}
function failure(error: { code?: string; message?: string } | null): KitchenResult {
  if (error?.code === "P0001" || error?.code === "42501") return {ok:false,message:error.message || "Bạn không có quyền thực hiện."};
  return {ok:false,message:"Chưa lưu được. Kiểm tra kết nối, tải lại dữ liệu rồi thử lại."};
}
export async function completeDuty(id: string): Promise<KitchenResult> {
  await requireProfile();
  try {
    const db = await createClient();
    const {error} = await db.rpc("kitchen_complete", {p_id:id});
    refreshKitchen();
    if (error) return failure(error);
    return {ok:true,message:"Đã lưu xác nhận."};
  } catch { return failure(null); }
}
export async function delegateDuty(id: string, member: string | null, expected: string): Promise<KitchenResult> {
  await requireProfile();
  try {
    const db = await createClient();
    const {error} = await db.rpc("kitchen_delegate", {p_id:id,p_member:member,p_expected:expected});
    refreshKitchen();
    return error ? failure(error) : {ok:true,message:member ? "Đã nhờ làm hộ." : "Đã hủy nhờ làm hộ."};
  } catch { return failure(null); }
}
export async function correctDuty(id: string, expected: string, member: string | null, at: string | null): Promise<KitchenResult> {
  await requireAdmin();
  try {
    const db = await createClient();
    const {error} = await db.rpc("kitchen_correct", {p_id:id,p_expected:expected,p_member:member,p_at:at});
    refreshKitchen();
    return error ? failure(error) : {ok:true,message:"Đã sửa xác nhận."};
  } catch { return failure(null); }
}
export async function saveKitchenSchedule(week: string, slots: KitchenSlot[], template: boolean, correctPast: boolean): Promise<KitchenResult> {
  await requireAdmin();
  try {
    const db = await createClient();
    const {error} = template
      ? await db.rpc("kitchen_save_template", {p_week:week,p_slots:slots})
      : await db.rpc("kitchen_save_week", {p_week:week,p_slots:slots,p_correct_past:correctPast});
    refreshKitchen();
    return error ? failure(error) : {ok:true,message:template ? "Đã lưu lịch mẫu. Các tuần đã tạo được giữ nguyên." : "Đã lưu đủ 15 công của tuần."};
  } catch { return failure(null); }
}

