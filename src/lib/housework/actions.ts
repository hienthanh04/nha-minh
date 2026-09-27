"use server";
import { revalidatePath } from "next/cache";
import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { mondayOf, vietnamToday } from "@/lib/date-format";
import { validHouseworkDate } from "./rules";

export type HouseworkResult = { ok: boolean; message: string; login?: boolean };

function refreshHousework() {
  for (const path of ["/", "/lich", "/lich-su", "/khac/quan-tri/viec-nha"]) revalidatePath(path);
}
function failure(code?: string): HouseworkResult {
  const messages: Record<string, string> = {
    P6001: "Hãy chọn ngày thứ Hai để bắt đầu tuần.",
    P6002: "Cần đủ 5 hồ sơ; mỗi người xuất hiện đúng một lần trong thứ tự luân phiên.",
    P6003: "Giữ nguyên tuần đang diễn ra và lịch sử. Hãy chọn tuần tương lai; chỉ thiết lập lần đầu được bắt đầu tuần này.",
    P6004: "Phân công đã thay đổi. Tải lại trước khi sửa.",
    P6005: "Chỉ sửa ngày đã tới và thời điểm không ở tương lai.",
    PGRST202: "Chưa có cập nhật quyền việc nhà. Hãy nhờ quản trị viên chạy migration mới.",
    P0001: "Chưa có phân công hoặc người xác nhận không đúng với phân công. Hãy tải lại.",
    "42501": "Bạn không có quyền thực hiện thao tác này. Hãy tải lại.",
    "23505": "Ngày này đã có xác nhận hoặc tuần đã có phân công. Đang tải lại; giờ đã lưu được giữ nguyên.",
    "23503": "Bản ghi phải khớp với phân công của tuần. Hãy tải lại.",
    "23001": "Tuần đã có lịch sử xác nhận nên không thể đổi người phụ trách.",
  };
  return { ok: false, message: messages[code ?? ""] ?? "Chưa lưu được việc nhà. Kiểm tra kết nối rồi tải lại để xem dữ liệu đã lưu." };
}
const denied: HouseworkResult = { ok: false, login: true, message: "Phiên đăng nhập không còn hợp lệ hoặc tài khoản chưa có hồ sơ. Vui lòng đăng nhập lại." };

export async function checkInHousework(displayedDate: string): Promise<HouseworkResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  const today = vietnamToday();
  if (displayedDate !== today) return { ok: false, message: "Đã sang ngày mới. Tải lại trước khi xác nhận việc nhà." };
  try {
    const db = await createClient();
    const assignment = await db.from("housework_weeks").select("responsible_member_id").eq("week_start", mondayOf(today)).maybeSingle();
    if (assignment.error) return failure();
    if (!assignment.data) return { ok: false, message: "Tuần này chưa có phân công việc nhà." };
    if (assignment.data.responsible_member_id !== access.profile.id) return { ok: false, message: "Chỉ người phụ trách tuần này được xác nhận hôm nay." };
    // Database defaults the time; RLS, trigger and FK recheck date/member/assignment.
    const { error } = await db.from("housework_checkins").insert({ member_id: access.profile.id, date: today });
    refreshHousework();
    return error ? failure(error.code) : { ok: true, message: "Đã lưu xác nhận việc nhà hôm nay." };
  } catch { return failure(); }
}

export async function saveHouseworkRotation(week: string, order: string[]): Promise<HouseworkResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (!validHouseworkDate(week) || mondayOf(week) !== week) return failure("P6001");
  try {
    const db = await createClient();
    const { error } = await db.rpc("housework_save_rotation", { p_week: week, p_members: order });
    refreshHousework();
    return error ? failure(error.code) : { ok: true, message: "Đã lưu thứ tự. Các tuần chưa tạo sẽ dùng thứ tự này; tuần đã có phân công được giữ nguyên." };
  } catch { return failure(); }
}

export async function assignHouseworkWeek(week: string, member: string, expected: string | null): Promise<HouseworkResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (!validHouseworkDate(week) || mondayOf(week) !== week) return failure("P6001");
  try {
    const db = await createClient();
    const { error } = await db.rpc("housework_assign_week", { p_week: week, p_member: member, p_expected: expected });
    refreshHousework();
    return error ? failure(error.code) : { ok: true, message: "Đã lưu người phụ trách riêng cho tuần này." };
  } catch { return failure(); }
}

export async function correctHousework(date: string, expected: string | null, at: string | null): Promise<HouseworkResult> {
  const access = await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? failure() : denied;
  if (!validHouseworkDate(date) || date > vietnamToday() || (at !== null && (!Number.isFinite(Date.parse(at)) || Date.parse(at) > Date.now()))) {
    return { ok: false, message: "Chỉ sửa ngày đã tới và thời điểm không ở tương lai." };
  }
  if (!expected && !at) return { ok: false, message: "Chưa có xác nhận để bỏ." };
  try {
    const db = await createClient();
    const response = await db.rpc("housework_correct", { p_date: date, p_expected: expected, p_at: at });
    refreshHousework();
    if (response.error) return failure(response.error.code);
    return { ok: true, message: at ? "Đã lưu sửa xác nhận." : "Đã bỏ xác nhận nhầm." };
  } catch { return failure(); }
}
