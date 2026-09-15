import { HomeScreen } from "@/components/home-screen";
import { requireProfile } from "@/lib/auth/session";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { mondayOf, vietnamToday } from "@/lib/kitchen/rules";
import { KitchenHome } from "@/components/kitchen/week-view";
import { getDinner } from "@/lib/dinner/queries";
import { DinnerHome } from "@/components/dinner/views";

export default async function HomePage() {
  const profile = await requireProfile();
  const today = vietnamToday();
  const [data, dinner] = await Promise.all([getKitchenWeek(mondayOf(today)), getDinner(today,today)]);
  return <HomeScreen profile={profile} kitchen={<KitchenHome data={data} profile={profile} />} dinner={<DinnerHome data={dinner} profile={profile}/>} />;
}
