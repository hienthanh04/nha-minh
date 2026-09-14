import { HomeScreen } from "@/components/home-screen";
import { requireProfile } from "@/lib/auth/session";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { mondayOf, vietnamToday } from "@/lib/kitchen/rules";
import { KitchenHome } from "@/components/kitchen/week-view";

export default async function HomePage() {
  const profile = await requireProfile();
  const data = await getKitchenWeek(mondayOf(vietnamToday()));
  return <HomeScreen profile={profile} kitchen={<KitchenHome data={data} profile={profile} />} />;
}
