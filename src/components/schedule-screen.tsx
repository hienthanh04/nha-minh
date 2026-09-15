"use client";
import type { ReactNode } from "react";

import { BrushCleaning } from "lucide-react";
import { Card, CardHeading, PageHeading } from "@/components/ui";

import { members } from "@/lib/mock-data";

export default function SchedulePage({ kitchen, dinner }: { kitchen: ReactNode; dinner: ReactNode }) {
  return <>
    <PageHeading eyebrow="Cùng nhau sắp xếp" title="Lịch của nhà mình" description="Bếp và bữa tối đã kết nối · Lượt việc nhà vẫn là mẫu" />
    <div className="space-y-4">
      {kitchen}
      {dinner}
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
