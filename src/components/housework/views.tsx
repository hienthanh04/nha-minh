import Link from "next/link";
import { BrushCleaning } from "lucide-react";
import { Card, CardHeading } from "@/components/ui";
import { WeekSelector } from "@/components/kitchen/week-view";
import { addDays, dateText, timeText } from "@/lib/kitchen/rules";
import type { HouseworkData } from "@/lib/housework/queries";
import { houseworkStatus } from "@/lib/housework/rules";
import type { FamilyProfile } from "@/lib/auth/profile";
import { HouseworkCheckinButton } from "./controls";

function SetupHint({ admin }: { admin: boolean }) {
  return admin
    ? <Link className="button button-secondary mt-3 w-full" href="/khac/quan-tri/viec-nha">Thiết lập lượt việc nhà</Link>
    : <p className="mt-2 text-sm text-muted">Hãy nhờ quản trị viên thiết lập phân công.</p>;
}

export function HouseworkHome({ data, profile }: { data: HouseworkData; profile: FamilyProfile }) {
  const assignment = data.weeks.find(w => w.week_start === data.week);
  const member = data.members.find(m => m.id === assignment?.responsible_member_id);
  const checkin = data.checkins.find(c => c.date === data.today);
  return <Card>
    <CardHeading icon={BrushCleaning} title="Việc nhà tuần này" />
    {data.error ? <p role="alert" className="text-sm text-red-800">{data.error}</p> : !assignment ? <>
      <p>Tuần này chưa có phân công việc nhà.</p>
      <SetupHint admin={profile.role === "admin"} />
    </> : <>
      <p className="font-semibold">{member?.id === profile.id ? "Tuần này tới lượt bạn" : `Tuần này: ${member?.display_name ?? "Chưa đọc được tên"}`}</p>
      <p className="mb-4 mt-1 text-sm text-muted">{dateText(data.week)} – {dateText(addDays(data.week, 6))}</p>
      {checkin ? <p className="completed">✅ Đã làm hôm nay lúc {timeText(checkin.completed_at)}</p>
        : member?.id === profile.id ? <HouseworkCheckinButton today={data.today} />
        : <p className="text-sm text-muted">⏳ Hôm nay: Chưa xác nhận</p>}
      {checkin && <details className="mt-3 text-sm text-muted">
        <summary>Sửa xác nhận nhầm</summary>
        {profile.role === "admin" ? <Link className="text-button" href={`/khac/quan-tri/viec-nha?week=${data.week}`}>Mở công cụ quản trị</Link>
          : <p className="mt-2">Hãy nhờ quản trị viên sửa giúp.</p>}
      </details>}
    </>}
  </Card>;
}

export function HouseworkSchedule({ data, admin }: { data: HouseworkData; admin: boolean }) {
  return <Card>
    <CardHeading icon={BrushCleaning} title="Lượt việc nhà" />
    <WeekSelector week={data.week} path="/lich" />
    {data.error ? <p role="alert" className="text-red-800">{data.error}</p> : <ul className="space-y-3">
      {[data.week, addDays(data.week, 7)].map((week, index) => {
        const assignment = data.weeks.find(w => w.week_start === week);
        const member = data.members.find(m => m.id === assignment?.responsible_member_id);
        return <li key={week} className="rounded-xl bg-slate-50 p-3">
          <p className="text-xs text-muted">{index === 0 ? "TUẦN ĐANG XEM" : "TUẦN KẾ TIẾP"}</p>
          <p className="my-2 text-sm">{dateText(week)} – {dateText(addDays(week, 6))}</p>
          <p className="font-semibold">{assignment ? `👤 ${member?.display_name ?? "Chưa đọc được tên"}` : "Tuần này chưa có phân công việc nhà."}</p>
        </li>;
      })}
    </ul>}
    {admin && <SetupHint admin />}
  </Card>;
}

export function HouseworkHistory({ data }: { data: HouseworkData }) {
  const assignment = data.weeks.find(w => w.week_start === data.week);
  const member = data.members.find(m => m.id === assignment?.responsible_member_id);
  return <Card>
    <CardHeading icon={BrushCleaning} title="Lịch sử việc nhà" />
    <WeekSelector week={data.week} path="/lich-su" />
    {data.error ? <p role="alert" className="text-red-800">{data.error}</p> : <>
      <p className="mb-3 font-semibold">{assignment ? `Phụ trách: ${member?.display_name ?? "Chưa đọc được tên"}` : "Tuần này chưa có phân công việc nhà."}</p>
      <ul className="space-y-2">
        {Array.from({ length: 7 }, (_, i) => addDays(data.week, i)).map(date => {
          const at = data.checkins.find(c => c.date === date)?.completed_at ?? null;
          return <li key={date} className="flex flex-wrap justify-between gap-2 border-b border-slate-100 py-3 text-sm">
            <span>{dateText(date)}</span>
            <span className={at ? "text-teal" : "text-muted"}>{at ? `✅ ${houseworkStatus(at)} lúc ${timeText(at)}` : "⏳ Chưa xác nhận"}{date > data.today ? " · Chưa tới ngày" : ""}</span>
          </li>;
        })}
      </ul>
    </>}
  </Card>;
}
