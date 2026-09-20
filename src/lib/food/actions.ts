"use server";
import { revalidatePath } from "next/cache";
import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { HouseholdInput, FoodBatch } from "./rules";

export type FoodResult = { ok: boolean; message: string; login?: boolean };
function refreshFood() {
  for (const path of ["/", "/lich-su", "/khac/quan-tri/do-an"]) revalidatePath(path);
}
function failure(code?: string): FoodResult {
  const messages: Record<string, string> = {
    P7001: "Kiểm tra tên và thứ tự không trùng; cần ít nhất một nhà đang tham gia gửi đồ.",
    P7002: "Dữ liệu đã thay đổi hoặc thao tác đã được thực hiện. Hãy tải lại trước khi thử tiếp.",
    P7003: "Lượt đầu đã được khởi tạo. Hãy tải lại để xem đợt hiện tại.",
    P7004: "Trạng thái hoặc ngày sửa không hợp lệ. Dùng nút nhận/hết ở Hôm nay cho thao tác thông thường.",
    P7005: "Lượt kế tiếp đã thay đổi hoặc đã nhận đồ, không thể mở lại đợt cũ.",
    "23505": "Lượt gửi đồ đã thay đổi. Hãy tải lại; không tạo thêm đợt trùng.",
    "42501": "Bạn không có quyền thực hiện thao tác này.",
    "23514": "Ngày nhận và ngày hết chưa hợp lệ. Hãy kiểm tra lại.",
    PGRST202: "Chưa thể cập nhật lượt gửi đồ. Hãy nhờ quản trị viên kiểm tra thiết lập.",
  };
  return { ok: false, message: messages[code ?? ""] ?? "Chưa lưu được lượt gửi đồ ăn. Kiểm tra kết nối rồi tải lại để xem trạng thái thật." };
}
const denied: FoodResult = { ok: false, login: true, message: "Phiên đăng nhập không hợp lệ hoặc tài khoản chưa có hồ sơ. Vui lòng đăng nhập lại." };

export async function transitionFood(id: string, expected: string, kind: "receive" | "finish"): Promise<FoodResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (kind !== "receive" && kind !== "finish") return failure("P7004");
  try {
    const db = await createClient();
    const { error } = await db.rpc(kind === "receive" ? "food_receive" : "food_finish", { p_id: id, p_expected: expected });
    refreshFood();
    return error ? failure(error.code) : { ok: true, message: kind === "receive" ? "Đã nhận đồ ăn." : "Đã kết thúc đợt và chuyển sang lượt chờ tiếp theo." };
  } catch { return failure(); }
}
export async function saveFoodHouseholds(items: HouseholdInput[]): Promise<FoodResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (access.profile.role !== "admin") return failure("42501");
  try {
    const db = await createClient();
    const { error } = await db.rpc("food_save_households", { p_items: items });
    refreshFood();
    return error ? failure(error.code) : { ok: true, message: "Đã lưu các nhà gửi đồ. Đợt hiện tại giữ nguyên nhà phụ trách." };
  } catch { return failure(); }
}
export async function initializeFood(household: string): Promise<FoodResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (access.profile.role !== "admin") return failure("42501");
  try {
    const db = await createClient();
    const { error } = await db.rpc("food_initialize", { p_household: household });
    refreshFood();
    return error ? failure(error.code) : { ok: true, message: "Đã khởi tạo lượt chờ đầu tiên." };
  } catch { return failure(); }
}
export type FoodCorrection = { status: FoodBatch["status"]; start: string | null; finished: string | null; note: string; successorExpected: string | null };
export async function correctFood(id: string, expected: string, values: FoodCorrection): Promise<FoodResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (access.profile.role !== "admin") return failure("42501");
  try {
    const db = await createClient();
    const { error } = await db.rpc("food_correct", { p_id: id, p_expected: expected, p_status: values.status, p_start: values.start, p_finished: values.finished, p_note: values.note, p_successor_expected: values.successorExpected });
    refreshFood();
    return error ? failure(error.code) : { ok: true, message: "Đã lưu chỉnh sửa đợt đồ ăn." };
  } catch { return failure(); }
}
