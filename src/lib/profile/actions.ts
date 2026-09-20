"use server";

import { revalidatePath } from "next/cache";
import { getAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { prepareAvatar } from "./image";

export type ProfileResult = { ok: boolean; message: string; login?: boolean };
export async function saveProfile(form: FormData): Promise<ProfileResult> {
  const access = await getAccess();
  if (access.status !== "family") return { ok: false, login: access.status !== "unavailable", message: "Chưa kiểm tra được tài khoản. Vui lòng thử lại hoặc đăng nhập lại." };
  const name = form.get("name");
  if (typeof name !== "string" || !name.trim() || [...name.trim()].length > 60) return { ok: false, message: "Tên cần từ 1 đến 60 ký tự." };
  const expected = form.get("expected");
  if (typeof expected !== "string" || !Number.isFinite(Date.parse(expected))) return { ok: false, message: "Hồ sơ chưa sẵn sàng. Hãy tải lại hoặc nhờ quản trị viên kiểm tra thiết lập." };
  const upload = form.get("avatar");
  let bytes: Buffer | null = null;
  if (upload instanceof File && upload.size) {
    try { bytes = await prepareAvatar(new Uint8Array(await upload.arrayBuffer())); }
    catch { return { ok: false, message: "Không đọc được ảnh. Hãy chọn ảnh JPG, PNG hoặc WebP khác." }; }
  }
  const db = await createClient();
  const storage = db.storage.from("family-avatars");
  const oldPath = access.profile.avatar_path ?? null;
  let path = form.get("remove") === "yes" ? null : oldPath;
  let newPath: string | null = null;
  try {
    if (bytes) {
      newPath = `${access.profile.id}/${crypto.randomUUID()}.jpg`;
      const { error } = await storage.upload(newPath, bytes, { contentType: "image/jpeg", upsert: false });
      if (error) return { ok: false, message: "Chưa tải được ảnh. Kiểm tra mạng hoặc nhờ quản trị viên kiểm tra nơi lưu ảnh." };
      path = newPath;
    }
    const { error } = await db.rpc("save_my_profile", { p_name: name.trim(), p_avatar: path, p_expected: expected });
    if (error) {
      // Storage's DELETE policy protects a live avatar, including an ambiguous network retry.
      if (newPath) await storage.remove([newPath]);
      const messages: Record<string, string> = {
        P8001: "Tên cần từ 1 đến 60 ký tự.", P8002: "Hồ sơ vừa thay đổi. Hãy tải lại trước khi lưu.",
        P8003: "Ảnh chưa hợp lệ. Hãy chọn lại ảnh.", PGRST202: "Chưa có thiết lập hồ sơ. Hãy nhờ quản trị viên cập nhật.",
      };
      return { ok: false, message: messages[error.code] ?? "Chưa lưu được hồ sơ. Hãy tải lại để kiểm tra rồi thử lại." };
    }
  } catch { return { ok: false, message: "Mất kết nối khi lưu. Hãy tải lại để kiểm tra hồ sơ trước khi thử lại." }; }
  // Profile is saved. Cleanup failure must not turn that successful save into an error.
  if (oldPath && oldPath !== path) { try { await storage.remove([oldPath]); } catch { /* Retry cleanup manually if needed. */ } }
  revalidatePath("/", "layout");
  return { ok: true, message: "Đã lưu hồ sơ của bạn." };
}
