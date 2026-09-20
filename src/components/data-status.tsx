"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function RefreshButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <button type="button" className="text-button" disabled={pending}
    onClick={() => startTransition(() => router.refresh())}>
    {pending ? "Đang tải…" : "Cập nhật dữ liệu"}
  </button>;
}

export function DataError({ message }: { message: string }) {
  return <div><p role="alert" className="text-sm text-red-800">{message}</p><RefreshButton /></div>;
}

export function ActionFeedback({ pending, result }: {
  pending: boolean; result: { ok: boolean; message: string } | null;
}) {
  return <>
    {pending && <p role="status" className="mt-2 text-sm text-muted">Đang lưu…</p>}
    {!pending && result && <p role={result.ok ? "status" : "alert"}
      className={`mt-2 text-sm ${result.ok ? "text-teal" : "text-red-800"}`}>{result.message}</p>}
  </>;
}
