import { requireAdmin } from "@/lib/auth/session";
import { getDinner } from "@/lib/dinner/queries";
import { dinnerFor, validDinnerDate } from "@/lib/dinner/rules";
import { vietnamToday, dateText } from "@/lib/kitchen/rules";
import { Card, PageHeading } from "@/components/ui";
import { DinnerAdminEditor } from "@/components/dinner/admin-editor";

export default async function DinnerAdminPage({searchParams}:{searchParams:Promise<{date?:string}>}) {
  await requireAdmin();
  const requested=(await searchParams).date;
  const date=validDinnerDate(requested)?requested:vietnamToday();
  const data=await getDinner(date,date);
  return <>
    <PageHeading eyebrow="Quản trị gia đình" title="Sửa bữa tối" description="Bỏ xác nhận nhầm trước khi chuyển sang Không ăn hoặc Chưa báo."/>
    <form className="mb-4 flex items-end gap-2">
      <label className="min-w-0 flex-1 text-sm">Chọn ngày<input type="date" name="date" defaultValue={date} className="auth-input mt-1" required/></label>
      <button className="button button-secondary">Xem</button>
    </form>
    <Card>
      <h2 className="mb-4 font-bold">{dateText(date)}</h2>
      {data.error ? <p role="alert" className="text-red-800">{data.error}</p> : data.members.map(member=><details key={member.id} className="border-b border-slate-100 py-3">
        <summary>{member.display_name}</summary>
        <div className="pt-3"><DinnerAdminEditor key={member.id+date} member={member.id} date={date} today={data.today} {...dinnerFor(member.id,date,data.plans,data.checkins)}/></div>
      </details>)}
    </Card>
  </>;
}
