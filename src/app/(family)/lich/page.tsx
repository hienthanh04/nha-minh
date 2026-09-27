import { requireProfile } from "@/lib/auth/session";
import ScheduleScreen from "@/components/schedule-screen";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { selectedWeek } from "@/lib/kitchen/rules";
import { KitchenWeekView } from "@/components/kitchen/week-view";
import { getDinner } from "@/lib/dinner/queries";
import { DinnerPlanner } from "@/components/dinner/views";
import { addDays } from "@/lib/kitchen/rules";
import { getHousework } from "@/lib/housework/queries";
import { HouseworkSchedule } from "@/components/housework/views";
export default async function SchedulePage({searchParams}: {searchParams: Promise<{week?:string}>}) {
  const profile = await requireProfile();
  const week = selectedWeek((await searchParams).week);
  const [data, dinner, housework] = await Promise.all([getKitchenWeek(week), getDinner(week,addDays(week,6)), getHousework(week)]);
  return <ScheduleScreen kitchen={<KitchenWeekView data={data} profile={profile}/>} dinner={<DinnerPlanner data={dinner} profile={profile} week={week}/>} housework={<HouseworkSchedule data={housework}/>} />;
}
