"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = { error: string };

export async function login(_previous: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || typeof password !== "string" ||
      !email.trim() || !password || email.length > 320 || password.length > 4096) {
    return { error: "Vui lòng nhập email và mật khẩu hợp lệ." };
  }
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      if (error.code === "invalid_credentials") return { error: "Email hoặc mật khẩu chưa đúng. Bạn thử lại nhé." };
      if (error.status === 429) return { error: "Bạn thử quá nhiều lần. Vui lòng đợi một chút rồi đăng nhập lại." };
      if (error.code === "email_not_confirmed") return { error: "Tài khoản chưa được xác nhận. Hãy nhờ quản trị viên kiểm tra." };
      return { error: "Chưa thể đăng nhập. Kiểm tra kết nối hoặc nhờ quản trị viên kiểm tra tài khoản." };
    }
  } catch {
    return { error: "Không thể kết nối đăng nhập. Vui lòng kiểm tra mạng và cấu hình Supabase rồi thử lại." };
  }
  revalidatePath("/", "layout");
  // /login checks the verified user and profile before redirecting to Home.
  redirect("/login");
}

export async function logout(_previous: AuthFormState): Promise<AuthFormState> {
  void _previous;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) return { error: "Chưa đăng xuất được. Kiểm tra kết nối rồi thử lại." };
  } catch {
    return { error: "Chưa đăng xuất được. Kiểm tra kết nối rồi thử lại." };
  }
  revalidatePath("/", "layout");
  redirect("/login");
}
