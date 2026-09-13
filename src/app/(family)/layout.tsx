import { requireProfile } from "@/lib/auth/session";
import { AppShell } from "@/components/app-shell";
import { PrototypeProvider } from "@/components/prototype-provider";
import { localDate } from "@/lib/mock-data";

export default async function FamilyLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireProfile();
  return <PrototypeProvider key={profile.id} today={localDate(new Date())}>
    <AppShell>{children}</AppShell>
  </PrototypeProvider>;
}

