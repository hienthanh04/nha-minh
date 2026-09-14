import { requireProfile } from "@/lib/auth/session";
import HistoryScreen from "@/components/history-screen";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { selectedWeek } from "@/lib/kitchen/rules";
import { KitchenWeekView } from "@/components/kitchen/week-view";
export default async function HistoryPage({searchParams}: {searchParams: Promise<{week?:string}>}) {
  const profile = await requireProfile();
  const data = await getKitchenWeek(selectedWeek((await searchParams).week));
  return <HistoryScreen kitchen={<KitchenWeekView data={data} profile={profile} history/>} />;
}
