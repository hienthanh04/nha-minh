"use client";

import { useState } from "react";

export function Avatar({ id, name, path, large = false, preview }: {
  id: string; name: string; path?: string | null; large?: boolean; preview?: string | null;
}) {
  const src = preview || (path ? `/anh-dai-dien/${encodeURIComponent(id)}?v=${encodeURIComponent(path)}` : null);
  const [failed, setFailed] = useState<string | null>(null);
  return <span className={`avatar avatar-teal overflow-hidden ${large ? "avatar-large" : ""}`} aria-label={`Ảnh đại diện của ${name}`}>
    {src && src !== failed
      // Authenticated same-origin endpoint; no public image CDN or shared optimizer cache.
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(src)} />
      : name.trim().slice(0, 1).toUpperCase() || "?"}
  </span>;
}
