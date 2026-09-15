"use server";
import { revalidatePath } from "next/cache";
import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { vietnamToday } from "@/lib/kitchen/rules";
import { validDinnerDate, validPlan, mayChangePlan, type DinnerPlan } from "./rules";

export type DinnerResult = { ok:boolean; message:string; login?:boolean };
function refreshDinner() {
  for (const path of ["/","/lich","/lich-su","/khac/quan-tri/bua-toi"]) revalidatePath(path);
}
function dinnerError(code?:string):DinnerResult {
  if (code === "P0001" || code === "23503" || code === "23001") return {ok:false,message:"Cần báo Có ăn trước khi xác nhận. Nếu đã ăn, hãy nhờ quản trị viên bỏ xác nhận nhầm trước khi đổi lựa chọn."};
  if (code === "42501") return {ok:false,message:"Bạn không có quyền sửa bản ghi này hoặc ngày đã qua. Hãy tải lại."};
  if (code === "23505") return {ok:false,message:"Bản ghi đã tồn tại. Đang tải lại trạng thái đã lưu; thời điểm cũ được giữ nguyên."};
  return {ok:false,message:"Chưa lưu được bữa tối. Kiểm tra kết nối rồi tải lại để xem trạng thái mới nhất."};
}
const denied:DinnerResult={ok:false,message:"Phiên đăng nhập không còn hợp lệ hoặc tài khoản chưa có quyền truy cập. Vui lòng đăng nhập lại.",login:true};

// Target member is supplied only by an explicitly checked admin operation.
async function writePlan(member:string,date:string,plan:DinnerPlan):Promise<DinnerResult> {
  const db=await createClient();
  const {error}=plan === "unknown"
    ? await db.from("dinner_plans").delete().eq("member_id",member).eq("date",date)
    : await db.from("dinner_plans").upsert({member_id:member,date,plan},{onConflict:"member_id,date"});
  refreshDinner();
  return error ? dinnerError(error.code) : {ok:true,message:"Đã lưu lựa chọn bữa tối."};
}
export async function setDinnerPlan(date:string,plan:DinnerPlan):Promise<DinnerResult> {
  const access=await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? dinnerError() : denied;
  if (!validPlan(plan) || !mayChangePlan(date,vietnamToday())) return {ok:false,message:"Chỉ thay đổi lựa chọn của hôm nay hoặc ngày tương lai."};
  try { return await writePlan(access.profile.id,date,plan); } catch { return dinnerError(); }
}
export async function checkInDinner(displayedDate:string):Promise<DinnerResult> {
  const access=await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? dinnerError() : denied;
  const today=vietnamToday();
  if (displayedDate !== today) return {ok:false,message:"Đã sang ngày mới. Tải lại trước khi xác nhận bữa tối."};
  try {
    const db=await createClient();
    // Timestamp defaults to database now(); no timestamp/member identity from the browser.
    const {error}=await db.from("dinner_checkins").insert({member_id:access.profile.id,date:today});
    refreshDinner();
    return error ? dinnerError(error.code) : {ok:true,message:"Đã lưu xác nhận ăn tối."};
  } catch { return dinnerError(); }
}
export async function adminSetDinnerPlan(member:string,date:string,plan:DinnerPlan):Promise<DinnerResult> {
  const access=await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? dinnerError() : denied;
  if (access.profile.role !== "admin") return {ok:false,message:"Chỉ quản trị viên được sửa cho thành viên khác."};
  if (!validPlan(plan) || !validDinnerDate(date)) return {ok:false,message:"Ngày hoặc lựa chọn không hợp lệ."};
  try { return await writePlan(member,date,plan); } catch { return dinnerError(); }
}
export async function adminCorrectDinner(member:string,date:string,expected:string|null,at:string|null):Promise<DinnerResult> {
  const access=await getAccess();
  if (access.status !== "family") return access.status === "unavailable" ? dinnerError() : denied;
  if (access.profile.role !== "admin") return {ok:false,message:"Chỉ quản trị viên được sửa xác nhận."};
  if (!validDinnerDate(date) || date>vietnamToday() || (at!==null && (!Number.isFinite(Date.parse(at)) || Date.parse(at)>Date.now()))) {
    return {ok:false,message:"Chỉ sửa xác nhận của ngày đã tới, với thời điểm không ở tương lai."};
  }
  if (!expected && !at) return {ok:false,message:"Chưa có xác nhận để bỏ."};
  try {
    const db=await createClient();
    // Conditional correction never removes a check-in whose timestamp has changed.
    const response=expected
      ? at
        ? await db.from("dinner_checkins").update({completed_at:at}).eq("member_id",member).eq("date",date).eq("completed_at",expected).select("member_id")
        : await db.from("dinner_checkins").delete().eq("member_id",member).eq("date",date).eq("completed_at",expected).select("member_id")
      : await db.from("dinner_checkins").insert({member_id:member,date,completed_at:at!}).select("member_id");
    refreshDinner();
    if (response.error) return dinnerError(response.error.code);
    if (!response.data?.length) return {ok:false,message:"Bản ghi đã thay đổi. Tải lại trước khi sửa."};
    return {ok:true,message:at ? "Đã sửa xác nhận ăn tối." : "Đã bỏ xác nhận nhầm. Có thể đổi lựa chọn."};
  } catch { return dinnerError(); }
}
