import { requireProfile } from "@/lib/auth/session";
import ScheduleScreen from "@/components/schedule-screen";
export default async function SchedulePage() {
  await requireProfile();
  return <ScheduleScreen />;
}

