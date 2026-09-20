import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth/session";
import { ProfileEditor } from "@/components/profile-editor";
import { LogoutForm } from "@/components/auth-forms";

export default async function WelcomePage() {
  const profile = await requireProfile();
  if (profile.profile_setup_at) redirect("/");
  return <main className="auth-shell">
    <h1 className="mb-3 text-3xl font-bold">Giới thiệu bạn với nhà mình</h1>
    <p className="mb-6 text-muted">Chọn tên mọi người sẽ thấy. Bạn có thể thêm ảnh bây giờ hoặc để sau.</p>
    <section className="card"><ProfileEditor key={profile.updated_at} profile={profile} onboarding /></section>
    <div className="mt-6"><LogoutForm /></div>
  </main>;
}
