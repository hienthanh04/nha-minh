import Link from "next/link";
import { ChefHat } from "lucide-react";
import { Card, CardHeading } from "@/components/ui";
import { KitchenDutyCard } from "./duty-card";
import { addDays, dateText, mondayOf, relatedDuties, responsibleId, weeklyCount, workloadLabel } from "@/lib/kitchen/rules";
import type { KitchenWeek } from "@/lib/kitchen/queries";
import type { FamilyProfile } from "@/lib/auth/profile";

export function WeekSelector({week, path}: {week:string; path:string}) {
  return <div className="mb-4 space-y-3">
    <div className="flex items-center justify-between gap-2">
      <Link className="button button-secondary" href={`${path}?week=${addDays(week,-7)}`} aria-label="Tuần trước">←</Link>
      <p className="text-center text-sm font-semibold">{dateText(week)}<br />– {dateText(addDays(week,6))}</p>
      <Link className="button button-secondary" href={`${path}?week=${addDays(week,7)}`} aria-label="Tuần sau">→</Link>
    </div>
    <form action={path} className="flex items-end gap-2">
      <label className="min-w-0 flex-1 text-sm">Chọn ngày trong tuần<input className="auth-input mt-1 min-w-0" name="week" type="date" defaultValue={week} required /></label>
      <button className="button button-secondary">Xem</button>
    </form>
  </div>;
}
function Empty({data}: {data:KitchenWeek}) {
  return <p role={data.error ? "alert" : "status"} className={data.error ? "text-sm text-red-800" : "text-sm text-muted"}>
    {data.error ?? "Tuần này chưa có lịch nấu/rửa."}
  </p>;
}
export function KitchenHome({data,profile}: {data:KitchenWeek;profile:FamilyProfile}) {
  const own = data.duties.filter(d => d.date === data.today && responsibleId(d) === profile.id);
  return <Card className="kitchen-card">
    <CardHeading icon={ChefHat} title="Việc của bạn hôm nay"><Link href="/lich" className="small-link" aria-label="Xem lịch công bếp">→</Link></CardHeading>
    {data.error || data.duties.length === 0 ? <Empty data={data}/> : own.length === 0
      ? <p className="text-sm text-muted">Hôm nay bạn không có công nấu/rửa.</p>
      : own.map(d => <KitchenDutyCard key={d.id} duty={d} members={data.members} userId={profile.id} admin={profile.role === "admin"} today={data.today}/>)}
  </Card>;
}
export function KitchenWeekView({data,profile,history=false}: {data:KitchenWeek;profile:FamilyProfile;history?:boolean}) {
  return <Card>
    <CardHeading icon={ChefHat} title={history ? "Tổng công bếp" : "Công bếp trong tuần"}>
      {history && data.week === mondayOf(data.today) && <span className="status status-warm">Tạm tính</span>}
    </CardHeading>
    <WeekSelector week={data.week} path={history ? "/lich-su" : "/lich"}/>
    {data.error || data.duties.length === 0 ? <Empty data={data}/> : history ? <>
      <p className="mb-3 text-sm text-muted">Tính theo người thực sự làm và ngày của công. Chạm vào tên để xem chi tiết; công chưa xác nhận vẫn có thể xác nhận sau.</p>
      {data.members.map(member => {
        const count = weeklyCount(data.duties, member.id, data.week);
        return <details key={member.id} className="border-b border-slate-100 py-2">
          <summary><span className="inline-flex w-[calc(100%-24px)] items-center gap-2"><span className="min-w-0 flex-1">{member.display_name}</span><span>{count}/3</span><span className="status status-warm">{workloadLabel(count)}</span></span></summary>
          {relatedDuties(data.duties,member.id).map(d => <KitchenDutyCard key={d.id} duty={d} members={data.members} userId={profile.id} admin={profile.role==="admin"} today={data.today}/>)}
        </details>;
      })}
    </> : <>
      {Array.from({length:5},(_,i)=>addDays(data.week,i)).map(date=><div key={date} className="mb-5 last:mb-0">
        <h3 className="mb-3 rounded-xl bg-slate-50 p-3 font-bold">{dateText(date)}</h3>
        {data.duties.filter(d=>d.date===date).map(d=><KitchenDutyCard key={d.id} duty={d} members={data.members} userId={profile.id} admin={profile.role==="admin"} today={data.today}/>)}
      </div>)}
      <p className="mt-4 text-sm text-muted">15 công / tuần · Mỗi người được phân công 3 công. Thứ Bảy và Chủ nhật nghỉ công bếp.</p>
    </>}
  </Card>;
}

