import Link from "next/link";
import { Utensils, Users } from "lucide-react";
import { Card, CardHeading } from "@/components/ui";
import { WeekSelector } from "@/components/kitchen/week-view";
import { addDays, dateText, timeText } from "@/lib/kitchen/rules";
import { dinnerFor, dinnerStatus } from "@/lib/dinner/rules";
import type { DinnerData } from "@/lib/dinner/queries";
import type { FamilyProfile } from "@/lib/auth/profile";
import { DinnerControls } from "./controls";

function DinnerError({error}:{error:string}) {
  return <p role="alert" className="text-sm text-red-800">{error}</p>;
}
export function DinnerHome({data,profile}:{data:DinnerData;profile:FamilyProfile}) {
  const own=dinnerFor(profile.id,data.today,data.plans,data.checkins);
  const waiting=data.members.filter(m=>{
    const state=dinnerFor(m.id,data.today,data.plans,data.checkins);
    return state.plan==="eating" && !state.at;
  });
  return <>
    <Card>
      <CardHeading icon={Utensils} title="Bữa tối của bạn"/>
      {data.error ? <DinnerError error={data.error}/> : <DinnerControls date={data.today} today={data.today} {...own} admin={profile.role==="admin"}/>}
    </Card>
    <Card>
      <CardHeading icon={Users} title="Cả nhà ăn tối"/>
      {data.error ? <DinnerError error={data.error}/> : <>
        {data.members.length!==5 && <p className="preview-note mb-3">Đang có {data.members.length}/5 hồ sơ. Quản trị viên cần hoàn tất hồ sơ còn thiếu.</p>}
        <ul className="family-list" aria-label="Trạng thái bữa tối của gia đình">
          {data.members.map(m=>{
            const state=dinnerFor(m.id,data.today,data.plans,data.checkins);
            const status=dinnerStatus(state.plan,state.at);
            return <li key={m.id} className="family-row">
              <span className="avatar avatar-teal" aria-hidden="true">{m.display_name.slice(0,1).toUpperCase()}</span>
              <span className="min-w-0 flex-1 break-words font-semibold">{m.display_name}{m.id===profile.id && <span className="ml-1 text-xs font-normal text-muted">Bạn</span>}</span>
              <span className={`status status-${status.tone}`}>{status.icon} {status.label}</span>
            </li>;
          })}
        </ul>
        <p className="save-food-note">{waiting.length ? `Nhớ để phần cho: ${waiting.map(m=>m.display_name).join(", ")}.` : "Không còn người báo Có ăn đang chờ ăn."}</p>
        <p className="mt-2 text-xs text-muted">Chưa báo vẫn là chưa rõ lựa chọn. Tải lại để xem thay đổi từ thiết bị khác.</p>
      </>}
    </Card>
  </>;
}
export function DinnerPlanner({data,profile,week}:{data:DinnerData;profile:FamilyProfile;week:string}) {
  return <Card>
    <CardHeading icon={Utensils} title="Bữa tối · Kế hoạch 7 ngày"/>
    <WeekSelector week={week} path="/lich"/>
    {data.error ? <DinnerError error={data.error}/> : <div className="space-y-4">
      {Array.from({length:7},(_,i)=>addDays(week,i)).map(date=><div key={date} className="border-b border-slate-100 pb-4 last:border-0">
        <h3 className="mb-3 font-semibold">{dateText(date)}{date===data.today?" · Hôm nay":""}</h3>
        <DinnerControls date={date} today={data.today} {...dinnerFor(profile.id,date,data.plans,data.checkins)} planner admin={profile.role==="admin"}/>
      </div>)}
    </div>}
    {profile.role==="admin" && <Link className="text-button mt-3" href="/khac/quan-tri/bua-toi">Sửa bữa tối cho thành viên</Link>}
  </Card>;
}
export function DinnerHistory({data,profile,week}:{data:DinnerData;profile:FamilyProfile;week:string}) {
  return <Card>
    <CardHeading icon={Utensils} title="Lịch sử bữa tối của bạn"/>
    <WeekSelector week={week} path="/lich-su"/>
    {data.error ? <DinnerError error={data.error}/> : <ul className="space-y-3">
      {Array.from({length:7},(_,i)=>addDays(week,i)).map(date=>{
        const state=dinnerFor(profile.id,date,data.plans,data.checkins);
        const status=dinnerStatus(state.plan,state.at);
        return <li key={date} className="rounded-xl bg-slate-50 p-3">
          <p className="font-semibold">{dateText(date)}</p>
          <p className="mt-1 text-sm">Kế hoạch: {state.plan==="eating"?"Có ăn":state.plan==="not_eating"?"Không ăn":"Chưa báo"}</p>
          <p className="mt-1 text-sm text-muted">{status.icon} {status.label}{state.at ? ` lúc ${timeText(state.at)}`:""}</p>
        </li>;
      })}
    </ul>}
  </Card>;
}
