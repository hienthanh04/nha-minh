
import type { ReactNode } from "react";

import { PageHeading } from "@/components/ui";

export default function SchedulePage({ kitchen, dinner, housework }: { kitchen: ReactNode; dinner: ReactNode; housework: ReactNode }) {
  return <>
    <PageHeading eyebrow="Cùng nhau sắp xếp" title="Lịch của nhà mình" description="Lịch bếp, bữa tối và lượt việc nhà của gia đình" />
    <div className="space-y-4">
      {kitchen}
      {dinner}
      {housework}
    </div>
  </>;
}
