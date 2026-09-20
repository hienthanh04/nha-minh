"use client";
import { ActionFeedback as FoodFeedback } from "@/components/data-status";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { transitionFood, type FoodResult } from "@/lib/food/actions";
import type { FoodBatch } from "@/lib/food/rules";

export function useFoodAction() {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<FoodResult | null>(null);
  const busy = useRef(false);
  const router = useRouter();
  function run(operation: () => Promise<FoodResult>, onSuccess?: () => void) {
    if (busy.current || pending) return;
    if (!navigator.onLine) { setResult({ok:false,message:"Đang mất kết nối. Chưa lưu thay đổi; hãy thử lại khi có mạng."}); return; }
    busy.current = true;
    setResult(null);
    startTransition(async () => {
      try {
        const response = await operation();
        setResult(response);
        if (response.ok) onSuccess?.();
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
export { ActionFeedback as FoodFeedback } from "@/components/data-status";

export function FoodControls({ batch, household }: { batch: FoodBatch; household: string }) {
  const action = useFoodAction();
  const dialog = useRef<HTMLDialogElement>(null);
  return <div className="mt-3" aria-busy={action.pending}>
    {batch.status === "waiting"
      ? <button className="button button-secondary w-full" disabled={action.pending} onClick={() => action.run(() => transitionFood(batch.id, batch.updated_at, "receive"))}>Đã gửi đồ</button>
      : batch.status === "active" && <button className="button button-secondary w-full" disabled={action.pending} onClick={() => dialog.current?.showModal()}>Đồ ăn đã hết</button>}
    <FoodFeedback {...action} />
    <dialog ref={dialog} className="dialog" aria-labelledby="food-finish-title">
      <h2 id="food-finish-title" className="mb-4 text-xl font-bold">Xác nhận đồ ăn của {household} đã hết?</h2>
      <p className="mb-4 text-sm text-muted">Đợt này sẽ được lưu vào lịch sử và tạo lượt chờ cho nhà tiếp theo.</p>
      <div className="grid grid-cols-2 gap-3">
        <button className="button button-secondary" autoFocus disabled={action.pending} onClick={() => dialog.current?.close()}>Hủy</button>
        <button className="button button-primary" disabled={action.pending} onClick={() => action.run(() => transitionFood(batch.id, batch.updated_at, "finish"), () => dialog.current?.close())}>Xác nhận</button>
      </div>
      <FoodFeedback {...action} />
    </dialog>
  </div>;
}
