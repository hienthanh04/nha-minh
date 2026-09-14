import { requireAdmin } from "@/lib/auth/session";
import { Card, PageHeading } from "@/components/ui";
import { getKitchenWeek, getKitchenTemplate } from "@/lib/kitchen/queries";
import { selectedWeek } from "@/lib/kitchen/rules";
import { WeekSelector } from "@/components/kitchen/week-view";
import { ScheduleEditor } from "@/components/kitchen/schedule-editor";

export default async function AdminPage({searchParams}: {searchParams:Promise<{week?:string}>}) {
  await requireAdmin();
  const week=selectedWeek((await searchParams).week);
  const data=await getKitchenWeek(week);
  const template=await getKitchenTemplate(week);
  const initial=data.duties.map(d=>({
    weekday: new Date(d.date+"T00:00:00Z").getUTCDay(),
    duty_type:d.duty_type,slot_number:d.slot_number,assigned_to:d.assigned_to,
  }));
  return <>
    <PageHeading eyebrow="Quản trị gia đình" title="Phân công bếp" description="Chọn người cho 15 công · Mỗi người đúng 3 công"/>
    <WeekSelector week={week} path="/khac/quan-tri"/>
    <Card>
      <h2 className="mb-4 text-lg font-bold">Lịch riêng của tuần</h2>
      {data.error ? <p role="alert" className="text-red-800">{data.error}</p>
        : <ScheduleEditor key={"week-"+week} week={week} today={data.today} members={data.members} initial={initial}
          blocked={data.duties.some(d=>d.status==="completed" || d.delegated_to!==null)}/>}
    </Card>
    <details className="card mt-4">
      <summary>Lịch mẫu lặp lại từ tuần đã chọn</summary>
      <p className="my-3 text-sm text-muted">Mẫu có hiệu lực gần nhất: {template.effective ?? "Chưa có mẫu"}. Mẫu mới dùng cho các tuần chưa tạo; các tuần đã có lịch được giữ nguyên.</p>
      {template.error || data.error ? <p role="alert" className="text-red-800">{template.error ?? data.error}</p>
        : <ScheduleEditor key={"template-"+week} week={week} today={data.today} initial={template.slots} members={data.members} template/>}
    </details>
  </>;
}
