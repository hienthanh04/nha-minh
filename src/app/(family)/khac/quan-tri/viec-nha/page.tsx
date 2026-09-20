import { DataError } from "@/components/data-status";
import { requireAdmin } from "@/lib/auth/session";
import { getHousework, getHouseworkRotation } from "@/lib/housework/queries";
import { addDays, dateText, selectedWeek } from "@/lib/kitchen/rules";
import { Card, PageHeading } from "@/components/ui";
import { WeekSelector } from "@/components/kitchen/week-view";
import { AssignmentEditor, HouseworkCorrection, RotationEditor } from "@/components/housework/admin-editor";

export default async function HouseworkAdminPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  await requireAdmin();
  const week = selectedWeek((await searchParams).week);
  const [data, rotation] = await Promise.all([getHousework(week), getHouseworkRotation(week)]);
  const assignment = data.weeks.find(w => w.week_start === week);
  const member = data.members.find(m => m.id === assignment?.responsible_member_id);
  return <>
    <PageHeading eyebrow="Quản trị gia đình" title="Phân công việc nhà" description="Một người mỗi tuần · Xác nhận từng ngày" />
    <WeekSelector week={week} path="/khac/quan-tri/viec-nha" />
    {data.error || rotation.error ? <Card><DataError message={data.error ?? rotation.error ?? "Không thể tải dữ liệu lúc này."} /></Card> : <div className="space-y-4">
      <Card>
        <h2 className="mb-4 text-lg font-bold">Thứ tự luân phiên</h2>
        <RotationEditor key={week + rotation.effective} week={week} members={data.members} initial={rotation.order} effective={rotation.effective} />
      </Card>
      <Card>
        <h2 className="mb-4 text-lg font-bold">Phân công riêng tuần đang xem</h2>
        <AssignmentEditor week={week} today={data.today} assignment={assignment} members={data.members} />
      </Card>
      <Card>
        <h2 className="mb-3 text-lg font-bold">Sửa xác nhận từng ngày</h2>
        {!assignment ? <p>Tuần này chưa có phân công việc nhà.</p> : <>
          <p className="mb-3 font-semibold">Phụ trách: {member?.display_name}</p>
          {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(date => <details key={date} className="border-b border-slate-100 py-3">
            <summary>{dateText(date)}</summary>
            <div className="pt-3">{date > data.today ? <p className="text-sm text-muted">Chưa tới ngày; không tạo xác nhận trước.</p>
              : <HouseworkCorrection date={date} at={data.checkins.find(c => c.date === date)?.completed_at ?? null} />}</div>
          </details>)}
        </>}
      </Card>
    </div>}
  </>;
}
