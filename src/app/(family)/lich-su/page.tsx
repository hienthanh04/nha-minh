import { requireProfile } from "@/lib/auth/session";
import HistoryScreen from "@/components/history-screen";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { selectedWeek } from "@/lib/kitchen/rules";
import { KitchenWeekView } from "@/components/kitchen/week-view";
import { getDinner } from "@/lib/dinner/queries";
import { DinnerHistory } from "@/components/dinner/views";
import { addDays } from "@/lib/kitchen/rules";
import { getHousework } from "@/lib/housework/queries";
import { HouseworkHistory } from "@/components/housework/views";
import { getFood } from "@/lib/food/queries";
import { foodPage } from "@/lib/food/rules";
import { FoodHistory } from "@/components/food/views";
export default async function HistoryPage({searchParams}: {searchParams: Promise<{week?:string; foodPage?:string}>}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const week = selectedWeek(params.week);
  const [data, dinner, housework, food] = await Promise.all([getKitchenWeek(week), getDinner(week,addDays(week,6)), getHousework(week), getFood(foodPage(params.foodPage))]);
  return <HistoryScreen kitchen={<KitchenWeekView data={data} profile={profile} history/>} dinner={<DinnerHistory data={dinner} profile={profile} week={week}/>} housework={<HouseworkHistory data={housework}/>} food={<FoodHistory data={food} week={week}/>} />;
}
