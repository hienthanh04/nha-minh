import { Suspense } from "react";
import { LoadingCard } from "@/components/loading-card";
import type { FamilyProfile } from "@/lib/auth/profile";
import { HomeScreen } from "@/components/home-screen";
import { requireProfile } from "@/lib/auth/session";
import { getKitchenWeek } from "@/lib/kitchen/queries";
import { mondayOf, vietnamToday } from "@/lib/kitchen/rules";
import { KitchenHome } from "@/components/kitchen/week-view";
import { getDinner } from "@/lib/dinner/queries";
import { DinnerHome } from "@/components/dinner/views";
import { getHousework } from "@/lib/housework/queries";
import { HouseworkHome } from "@/components/housework/views";
import { getFood } from "@/lib/food/queries";
import { FoodHome } from "@/components/food/views";


async function KitchenSection({ profile, today }: { profile: FamilyProfile; today: string }) {
  return <KitchenHome data={await getKitchenWeek(mondayOf(today), today)} profile={profile} />;
}
async function DinnerSection({ profile, today }: { profile: FamilyProfile; today: string }) {
  return <DinnerHome data={await getDinner(today, today, today)} profile={profile} />;
}
async function HouseworkSection({ profile, today }: { profile: FamilyProfile; today: string }) {
  return <HouseworkHome data={await getHousework(mondayOf(today), today)} profile={profile} />;
}
async function FoodSection({ profile }: { profile: FamilyProfile }) {
  return <FoodHome data={await getFood()} admin={profile.role === "admin"} />;
}
export default async function HomePage() {
  const profile = await requireProfile();
  const today = vietnamToday();
  return <HomeScreen profile={profile} today={today}
    kitchen={<Suspense fallback={<LoadingCard title="Việc của bạn hôm nay" />}><KitchenSection profile={profile} today={today} /></Suspense>}
    dinner={<Suspense fallback={<><LoadingCard title="Ăn tối của bạn" /><LoadingCard title="Tình hình ăn tối cả nhà" /></>}><DinnerSection profile={profile} today={today} /></Suspense>}
    housework={<Suspense fallback={<LoadingCard title="Việc nhà" />}><HouseworkSection profile={profile} today={today} /></Suspense>}
    food={<Suspense fallback={<LoadingCard title="Gửi đồ ăn" />}><FoodSection profile={profile} /></Suspense>}
  />;
}
