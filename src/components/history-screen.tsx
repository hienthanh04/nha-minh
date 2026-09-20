
import type { ReactNode } from "react";

import { PageHeading } from "@/components/ui";

export default function HistoryPage({ kitchen, dinner, housework, food }: { kitchen: ReactNode; dinner: ReactNode; housework: ReactNode; food: ReactNode }) {
  return <>
    <PageHeading eyebrow="Nhìn lại một chút" title="Lịch sử của cả nhà" description="Việc bếp, bữa tối, việc nhà và những đợt đồ ăn đã lưu" />
    <div className="space-y-4">
      {kitchen}
      {dinner}
      {housework}
      {food}
    </div>
  </>;
}
