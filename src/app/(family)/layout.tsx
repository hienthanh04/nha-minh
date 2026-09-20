import { requireProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  if (!profile.profile_setup_at) redirect("/gioi-thieu");
  return <AppShell>{children}</AppShell>;
}
