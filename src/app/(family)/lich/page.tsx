import { requireProfile } from "@/lib/auth/session";
import ScheduleScreen from "@/components/schedule-screen";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { selectedWeek } from "@/lib/kitchen/rules";
import { KitchenWeekView } from "@/components/kitchen/week-view";
import { getDinner } from "@/lib/dinner/queries";
import { DinnerPlanner } from "@/components/dinner/views";
import { addDays } from "@/lib/kitchen/rules";
export default async function SchedulePage({searchParams}: {searchParams: Promise<{week?:string}>}) {
  const profile = await requireProfile();
  const week = selectedWeek((await searchParams).week);
  const [data, dinner] = await Promise.all([getKitchenWeek(week), getDinner(week,addDays(week,6))]);
  return <ScheduleScreen kitchen={<KitchenWeekView data={data} profile={profile}/>} dinner={<DinnerPlanner data={dinner} profile={profile} week={week}/>} />;
}
