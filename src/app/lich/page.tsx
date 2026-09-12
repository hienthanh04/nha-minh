"use client";

import { BrushCleaning, ChefHat, Utensils } from "lucide-react";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { usePrototype } from "@/components/prototype-provider";
import { dateLabel, memberName, members } from "@/lib/mock-data";

export default function SchedulePage() {
  const { days, duties, today, dinnerPlans } = usePrototype();
  return <>
    <PageHeading eyebrow="Cùng nhau sắp xếp" title="Lịch của nhà mình" description={`${dateLabel(days[0], true)} – ${dateLabel(days[6], true)} · Lịch mẫu tuần này`} />
    <div className="space-y-4">
      <Card>
        <CardHeading icon={ChefHat} title="Công bếp trong tuần" />
        <div className="space-y-4">{days.slice(0, 5).map((date) => <div key={date} className="border-b border-slate-100 pb-4 last:border-0 last:pb-0">
          <h3 className="mb-2 text-sm font-bold capitalize">{dateLabel(date)}{date === today && <span className="ml-2 text-teal">· Hôm nay</span>}</h3>
          {duties.filter((duty) => duty.date === date).map((duty) => <div key={duty.id} className="flex gap-3 py-1.5 text-sm">
            <span className="w-20 shrink-0 text-muted">{duty.type === "cook" ? "🍳 Nấu ăn" : "🍽 Rửa chén"}</span>
            <span className="flex-1">{memberName(duty.delegatedTo ?? duty.assignedTo)}{duty.delegatedTo && <span className="text-muted"> · thay {memberName(duty.assignedTo)}</span>}</span>
            {duty.completedAt && <span className="text-teal" aria-label="Đã làm">✓</span>}
          </div>)}
        </div>)}</div>
        <p className="mt-4 text-sm text-muted">15 công / tuần · Mỗi người được phân công 3 công. Thứ Bảy và Chủ nhật nghỉ công bếp.</p>
      </Card>
      <Card>
        <CardHeading icon={Utensils} title="Bữa tối của bạn" />
        <p className="mb-3 text-sm text-muted">Xem trước lịch tuần. Thử đổi lựa chọn hôm nay ở màn hình Hôm nay.</p>
        <ul>{days.map((date) => <li key={date} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm last:border-0">
          <span className="capitalize">{dateLabel(date, true)}{date === today ? " · Hôm nay" : ""}</span>
          <span className="text-muted">{date === today ? dinnerPlans.thanh === "eating" ? "🍚 Có ăn" : dinnerPlans.thanh === "not_eating" ? "Không ăn" : "Chưa báo" : "Chưa báo"}</span>
        </li>)}</ul>
      </Card>
      <Card>
        <CardHeading icon={BrushCleaning} title="Lượt việc nhà" />
        <ol className="space-y-3">{members.map((member, index) => <li key={member.id} className="flex items-center gap-3 text-sm">
          <span className={`avatar avatar-${member.color}`}>{member.initial}</span>
          <span className="flex-1 font-semibold">{member.name}</span><span className="text-muted">{index === 0 ? "Tuần này" : index === 1 ? "Tuần sau" : `Sau ${index} tuần`}</span>
        </li>)}</ol>
      </Card>
    </div>
  </>;
}
