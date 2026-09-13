import { HomeScreen } from "@/components/home-screen";
import { requireProfile } from "@/lib/auth/session";

export default async function HomePage() {
  const profile = await requireProfile();
  return <HomeScreen profile={profile} />;
}
