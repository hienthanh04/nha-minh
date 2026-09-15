"use client";
import type { ReactNode } from "react";

import { BrushCleaning, CookingPot } from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { dateLabel, households, timeLabel } from "@/lib/mock-data";

export default function HistoryPage({ kitchen, dinner }: { kitchen: ReactNode; dinner: ReactNode }) {
  const { days, today, houseworkAt, foodBatches } = usePrototype();
  const finishedBatches = foodBatches.filter((batch) => batch.status === "finished");
  return <>
    <PageHeading eyebrow="Nhìn lại một chút" title="Lịch sử của cả nhà" description="Bếp và bữa tối đã kết nối · Việc nhà và đồ ăn vẫn là mẫu" />
    <div className="space-y-4">
      {kitchen}
      {dinner}
      <Card>
        <CardHeading icon={BrushCleaning} title="Việc nhà · Thanh" />
        <ul>{days.map((date) => <li key={date} className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-3 text-sm last:border-0">
          <span>{dateLabel(date, true)}{date === today ? " · Hôm nay" : ""}</span>
          <span className={date === today && houseworkAt ? "text-teal" : "text-muted"}>{date === today && houseworkAt ? `✓ Đã làm lúc ${timeLabel(houseworkAt)}` : date > today ? "Chưa tới ngày" : "Chưa xác nhận"}</span>
        </li>)}</ul>
      </Card>
      <Card>
        <CardHeading icon={CookingPot} title="Những đợt đồ ăn" />
        {finishedBatches.length === 0 ? <p className="text-sm leading-relaxed text-muted">Chưa có đợt nào kết thúc. Thử “Đồ ăn đã hết” ở Hôm nay để xem lịch sử mẫu.</p>
          : <ul className="space-y-3">{finishedBatches.toReversed().map((batch) => <li key={batch.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold">{households[batch.householdIndex]}</span><span className="text-muted">Đã hết lúc {timeLabel(batch.finishedAt!)}</span></li>)}</ul>}
      </Card>
    </div>
  </>;
}
