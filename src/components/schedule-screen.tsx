"use client";
import type { ReactNode } from "react";

import { BrushCleaning, Utensils } from "lucide-react";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { usePrototype } from "@/components/prototype-provider";
import { dateLabel, members } from "@/lib/mock-data";

export default function SchedulePage({ kitchen }: { kitchen: ReactNode }) {
  const { days, today, dinnerPlans } = usePrototype();
  return <>
    <PageHeading eyebrow="Cùng nhau sắp xếp" title="Lịch của nhà mình" description="Lịch bếp thật · Các mục còn lại là dữ liệu mẫu của tuần hiện tại" />
    <div className="space-y-4">
      {kitchen}
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
