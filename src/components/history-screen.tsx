"use client";
import type { ReactNode } from "react";

import { CookingPot } from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { households, timeLabel } from "@/lib/mock-data";

export default function HistoryPage({ kitchen, dinner, housework }: { kitchen: ReactNode; dinner: ReactNode; housework: ReactNode }) {
  const { foodBatches } = usePrototype();
  const finishedBatches = foodBatches.filter((batch) => batch.status === "finished");
  return <>
    <PageHeading eyebrow="Nhìn lại một chút" title="Lịch sử của cả nhà" description="Bếp, bữa tối và việc nhà đã kết nối · Đồ ăn vẫn là mẫu" />
    <div className="space-y-4">
      {kitchen}
      {dinner}
      {housework}
      <Card>
        <CardHeading icon={CookingPot} title="Những đợt đồ ăn" />
        {finishedBatches.length === 0 ? <p className="text-sm leading-relaxed text-muted">Chưa có đợt nào kết thúc. Thử “Đồ ăn đã hết” ở Hôm nay để xem lịch sử mẫu.</p>
          : <ul className="space-y-3">{finishedBatches.toReversed().map((batch) => <li key={batch.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{households[batch.householdIndex]}</span><span className="text-muted">Đã hết lúc {timeLabel(batch.finishedAt!)}</span></li>)}</ul>}
      </Card>
    </div>
  </>;
}
