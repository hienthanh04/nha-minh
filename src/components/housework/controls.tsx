"use client";
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
    if (busy.current) return;
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

export function HouseworkFeedback({ pending, result }: { pending: boolean; result: HouseworkResult | null }) {
  return <>
    {pending && <p role="status" className="mt-2 text-sm text-muted">Đang lưu…</p>}
    {result && <p role={result.ok ? "status" : "alert"} className={`mt-2 text-sm ${result.ok ? "text-teal" : "text-red-800"}`}>{result.message}</p>}
  </>;
}

export function HouseworkCheckinButton({ today }: { today: string }) {
  const action = useHouseworkAction();
  return <div aria-busy={action.pending}>
    <button className="button button-primary w-full" disabled={action.pending} onClick={() => action.run(() => checkInHousework(today))}>✓ Đã làm hôm nay</button>
    <HouseworkFeedback {...action} />
  </div>;
}
