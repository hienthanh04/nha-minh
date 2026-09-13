import { redirect } from "next/navigation";
import { getAccess } from "@/lib/auth/session";
import { LoginForm, LogoutForm } from "@/components/auth-forms";

export default async function LoginPage() {
  const access = await getAccess();
  if (access.status === "family") redirect("/");
  return <main className="auth-shell">
    <div className="mb-8"><p className="eyebrow">Chào mừng về nhà</p>
      <h1 className="mt-2 text-3xl font-bold">Nhà Mình</h1>
      <p className="mt-3 text-muted">Đăng nhập bằng tài khoản gia đình đã được cấp.</p></div>
    <section className="card" aria-label="Đăng nhập">
      {access.status === "missing-profile" ? <>
        <h2 className="mb-3 text-lg font-bold">Tài khoản chưa có quyền truy cập</h2>
        <p role="alert" className="mb-5 text-muted">Tài khoản đã đăng nhập nhưng chưa có hồ sơ gia đình hợp lệ. Hãy nhờ quản trị viên kiểm tra profile và mã tài khoản.</p>
        <LogoutForm />
      </> : <>
        {access.status === "unavailable" && <p role="alert" className="mb-5 text-sm text-red-800">Chưa kiểm tra được quyền truy cập. Kiểm tra mạng hoặc cấu hình Supabase rồi tải lại trang.</p>}
        <LoginForm />
        {access.status === "unavailable" && <div className="mt-4"><LogoutForm /></div>}
      </>}
    </section>
    <p className="mt-6 text-sm text-muted">Nếu quên mật khẩu, hãy liên hệ quản trị viên gia đình.</p>
  </main>;
}

