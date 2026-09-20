"use client";
import { ActionFeedback as HouseworkFeedback } from "@/components/data-status";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInHousework, type HouseworkResult } from "@/lib/housework/actions";

// Shared only by this feature's check-in and small admin forms.
export function useHouseworkAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<HouseworkResult | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  function run(operation: () => Promise<HouseworkResult>) {
    if (busy.current || pending) return;
    if (!navigator.onLine) { setResult({ok:false,message:"Đang mất kết nối. Chưa lưu thay đổi; hãy thử lại khi có mạng."}); return; }
    busy.current = true;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await operation();
        setResult(response);
        if (response.login) router.replace("/login");
      } catch {
        setResult({ ok: false, message: "Chưa lưu được. Kiểm tra kết nối rồi tải lại để xem trạng thái thật." });
      } finally {
        busy.current = false;
        router.refresh();
      }
    });
  }
  return { pending, result, run };
}

export { ActionFeedback as HouseworkFeedback } from "@/components/data-status";

export function HouseworkCheckinButton({ today }: { today: string }) {
  const action = useHouseworkAction();
  return <div aria-busy={action.pending}>
    <button className="button button-primary w-full" disabled={action.pending} onClick={() => action.run(() => checkInHousework(today))}>✓ Đã làm hôm nay</button>
    <HouseworkFeedback {...action} />
  </div>;
}
