"use client";

import { BrushCleaning, ChefHat, CookingPot } from "lucide-react";
import { usePrototype } from "@/components/prototype-provider";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { dateLabel, households, memberName, members, timeLabel } from "@/lib/mock-data";

export default function HistoryPage() {
  const { duties, days, today, houseworkAt, foodBatches } = usePrototype();
  const finishedBatches = foodBatches.filter((batch) => batch.status === "finished");
  return <>
    <PageHeading eyebrow="Nhìn lại một chút" title="Lịch sử của cả nhà" description={`${dateLabel(days[0], true)} – ${dateLabel(days[6], true)} · Dữ liệu mẫu`} />
    <div className="space-y-4">
      <Card>
        <CardHeading icon={ChefHat} title="Công bếp tuần này"><span className="status status-warm">Tạm tính</span></CardHeading>
        <p className="mb-3 text-sm text-muted">Tính cho người thực sự làm. Chạm vào tên để xem chi tiết.</p>
        {members.map((member) => {
          const count = duties.filter((duty) => duty.completedBy === member.id).length;
          const related = duties.filter((duty) => duty.assignedTo === member.id || duty.delegatedTo === member.id || duty.completedBy === member.id);
          return <details key={member.id} className="border-b border-slate-100 py-1 last:border-0">
            <summary><span className="ml-1 inline-flex w-[calc(100%-24px)] items-center gap-3"><span className="flex-1">{member.name}</span><span className="text-sm font-normal">{count}/3</span><span className={`status ${count === 3 ? "status-success" : "status-warm"}`}>{count === 3 ? "Đủ" : count < 3 ? `Thiếu ${3 - count}` : `Dư ${count - 3}`}</span></span></summary>
            <ul className="mb-3 mt-2 space-y-3 text-sm">{related.map((duty) => <li key={duty.id} className="rounded-xl bg-slate-50 p-3">
              <p className="font-semibold">{dateLabel(duty.date, true)} · {duty.type === "cook" ? "Nấu ăn" : "Rửa chén"}</p>
              <p className="mt-1 text-muted">Phân công: {memberName(duty.assignedTo)}{duty.delegatedTo ? ` · Nhờ ${memberName(duty.delegatedTo)}` : ""}</p>
              <p className="mt-1 text-muted">{duty.completedBy ? `Đã làm: ${memberName(duty.completedBy)}` : "Chưa xác nhận"}</p>
            </li>)}</ul>
          </details>;
        })}
      </Card>
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
