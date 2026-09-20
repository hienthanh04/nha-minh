"use server";
import { revalidatePath } from "next/cache";
import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { type KitchenSlot } from "./rules";

export type KitchenResult = { ok: boolean; message: string; login?: boolean };
async function accessError(admin = false): Promise<KitchenResult | null> {
  const access = await getAccess();
  if (access.status === "unavailable") return failure(null);
  if (access.status !== "family") return { ok: false, login: true, message: "Phiên đăng nhập đã hết hạn hoặc tài khoản chưa có hồ sơ. Vui lòng đăng nhập lại." };
  if (admin && access.profile.role !== "admin") return failure({ code: "42501" });
  return null;
}
function refreshKitchen() {
  for (const path of ["/", "/lich", "/lich-su", "/khac/quan-tri"]) revalidatePath(path);
}
function failure(error: { code?: string; message?: string } | null): KitchenResult {
  if (error?.code === "42501") return {ok:false,message:"Bạn không có quyền thực hiện thao tác này. Hãy cập nhật dữ liệu."};
  if (error?.code === "P0001") return {ok:false,message:"Chưa thể lưu: lịch hoặc trách nhiệm đã thay đổi, chưa tới ngày, hoặc phân công chưa hợp lệ. Hãy cập nhật dữ liệu và kiểm tra lại."};
  return {ok:false,message:"Chưa lưu được. Kiểm tra kết nối, tải lại dữ liệu rồi thử lại."};
}
export async function completeDuty(id: string): Promise<KitchenResult> {
  const denied = await accessError();
  if (denied) return denied;
  try {
    const db = await createClient();
    const {error} = await db.rpc("kitchen_complete", {p_id:id});
    refreshKitchen();
    if (error) return failure(error);
    return {ok:true,message:"Đã lưu xác nhận."};
  } catch { return failure(null); }
}
export async function delegateDuty(id: string, member: string | null, expected: string): Promise<KitchenResult> {
  const denied = await accessError();
  if (denied) return denied;
  try {
    const db = await createClient();
    const {error} = await db.rpc("kitchen_delegate", {p_id:id,p_member:member,p_expected:expected});
    refreshKitchen();
    return error ? failure(error) : {ok:true,message:member ? "Đã nhờ làm hộ." : "Đã hủy nhờ làm hộ."};
  } catch { return failure(null); }
}
export async function correctDuty(id: string, expected: string, member: string | null, at: string | null): Promise<KitchenResult> {
  const denied = await accessError(true);
  if (denied) return denied;
  try {
    const db = await createClient();
    const {error} = await db.rpc("kitchen_correct", {p_id:id,p_expected:expected,p_member:member,p_at:at});
    refreshKitchen();
    return error ? failure(error) : {ok:true,message:"Đã sửa xác nhận."};
  } catch { return failure(null); }
}
export async function saveKitchenSchedule(week: string, slots: KitchenSlot[], template: boolean, correctPast: boolean): Promise<KitchenResult> {
  const denied = await accessError(true);
  if (denied) return denied;
  try {
    const db = await createClient();
    const {error} = template
      ? await db.rpc("kitchen_save_template", {p_week:week,p_slots:slots})
      : await db.rpc("kitchen_save_week", {p_week:week,p_slots:slots,p_correct_past:correctPast});
    refreshKitchen();
    return error ? failure(error) : {ok:true,message:template ? "Đã lưu lịch mẫu. Các tuần đã tạo được giữ nguyên." : "Đã lưu đủ 15 công của tuần."};
  } catch { return failure(null); }
}
