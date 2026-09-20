"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { millisecondsToVietnamMidnight } from "@/lib/date-format";
import { RefreshButton } from "./data-status";

// Refresh server data; never queue writes or treat cached records as a successful save.
export function DataRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let lastRefresh = 0;
    let timer: ReturnType<typeof setTimeout>;
    function refresh() {
      setOffline(!navigator.onLine);
      if (!navigator.onLine || document.visibilityState !== "visible") return;
      // Do not reset an administrator's unsaved editor when returning from another app.
      if (pathname.startsWith("/khac/quan-tri")) return;
      if (Date.now() - lastRefresh < 1000) return;
      lastRefresh = Date.now();
      router.refresh();
    }
    function connection() { setOffline(!navigator.onLine); }
    function scheduleMidnight() {
      timer = setTimeout(() => { refresh(); scheduleMidnight(); }, millisecondsToVietnamMidnight());
    }
    connection();
    scheduleMidnight();
    window.addEventListener("online", refresh);
    window.addEventListener("offline", connection);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", connection);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [pathname, router]);
  return <div className="px-5 text-sm sm:px-7">
    {offline && <p role="status" className="preview-note">Đang mất kết nối. Dữ liệu có thể đã cũ; thao tác chưa lưu cần thử lại khi có mạng.</p>}
    <RefreshButton />
  </div>;
}
