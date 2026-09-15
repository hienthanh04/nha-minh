"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminSetDinnerPlan, adminCorrectDinner, type DinnerResult } from "@/lib/dinner/actions";
import type { DinnerPlan } from "@/lib/dinner/rules";
import { timeText } from "@/lib/kitchen/rules";

export function DinnerAdminEditor({member,date,today,plan,at}:{member:string;date:string;today:string;plan:DinnerPlan;at:string|null}) {
  const [pending,startTransition]=useTransition();
  const [result,setResult]=useState<DinnerResult|null>(null);
  const busy=useRef(false);
  const router=useRouter();
  function run(operation:()=>Promise<DinnerResult>) {
    if (busy.current) return;
    busy.current=true;setResult(null);
    startTransition(async()=>{
      try {
        const next=await operation();setResult(next);
        if (next.login) router.replace("/login");
      } catch {setResult({ok:false,message:"Chưa lưu được. Kiểm tra kết nối rồi tải lại."});}
      finally {busy.current=false;router.refresh();}
    });
  }
  return <div className="space-y-4" aria-busy={pending}>
    <form className="space-y-3" action={form=>run(()=>adminSetDinnerPlan(member,date,String(form.get("plan")) as DinnerPlan))}>
      <label className="block text-sm">Kế hoạch bữa tối<select key={plan} name="plan" className="auth-input mt-1" defaultValue={plan} disabled={pending}>
        <option value="unknown">Chưa báo</option><option value="eating">Có ăn</option><option value="not_eating">Không ăn</option>
      </select></label>
      <button disabled={pending} className="button button-secondary w-full">Lưu sửa kế hoạch</button>
    </form>
    <p className="text-sm">{at?`✅ Đã ăn lúc ${timeText(at)}`:"Chưa xác nhận ăn"}</p>
    {at && <form action={()=>run(()=>adminCorrectDinner(member,date,at,null))} className="space-y-3">
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={pending}/>Tôi xác nhận bỏ lần check-in nhầm này.</label>
      <button className="button button-secondary w-full" disabled={pending}>Bỏ xác nhận nhầm</button>
    </form>}
    {date<=today && plan==="eating" && <details>
      <summary className="text-sm">Sửa / bổ sung thời điểm đã ăn</summary>
      <form className="mt-3 space-y-3" action={form=>{
        const value=String(form.get("at")??"");
        run(()=>adminCorrectDinner(member,date,at,value+":00+07:00"));
      }}>
        <label className="block text-sm">Thời điểm · giờ Việt Nam<input className="auth-input mt-1 min-w-0" type="datetime-local" name="at" required disabled={pending}
          key={at??"none"} defaultValue={at?new Date(new Date(at).getTime()+7*3600000).toISOString().slice(0,16):""}/></label>
        <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={pending}/>Tôi xác nhận thời điểm này là đúng.</label>
        <button className="button button-secondary w-full" disabled={pending}>Lưu thời điểm</button>
      </form>
    </details>}
    {pending && <p role="status" className="text-sm text-muted">Đang lưu…</p>}
    {result && <p role={result.ok?"status":"alert"} className={`text-sm ${result.ok?"text-teal":"text-red-800"}`}>{result.message}</p>}
  </div>;
}
