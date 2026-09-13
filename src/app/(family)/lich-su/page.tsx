import { requireProfile } from "@/lib/auth/session";
import HistoryScreen from "@/components/history-screen";
export default async function HistoryPage() {
  await requireProfile();
  return <HistoryScreen />;
}

