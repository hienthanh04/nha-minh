"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInDinner, setDinnerPlan, type DinnerResult } from "@/lib/dinner/actions";
import { timeText } from "@/lib/date-format";
import { DINNER_DEFAULT_FROM, type DinnerPlan } from "@/lib/dinner/rules";

export function DinnerControls({date,today,plan,at,planner=false,admin=false}: {
  date:string;today:string;plan:DinnerPlan;at:string|null;planner?:boolean;admin?:boolean;
}) {
  const [result,setResult]=useState<DinnerResult|null>(null);
  const [pending,startTransition]=useTransition();
  const busy=useRef(false);
  const router=useRouter();
  const editable=date>=today;
  function run(operation:()=>Promise<DinnerResult>) {
    if (busy.current || pending) return;
    if (!navigator.onLine) { setResult({ok:false,message:"Đang mất kết nối. Chưa lưu thay đổi; hãy thử lại khi có mạng."}); return; }
    busy.current=true;setResult(null);
    startTransition(async()=>{
      try {
        const next=await operation();setResult(next);
        if (next.login) router.replace("/login");
      } catch {setResult({ok:false,message:"Chưa lưu được. Kiểm tra kết nối rồi tải lại để xem trạng thái thật."});}
      finally {busy.current=false;router.refresh();}
    });
  }
  return <div aria-busy={pending}>
    {at ? <>
      <p className="completed">✅ Đã ăn lúc {timeText(at)}</p>
      <details className="mt-2 text-sm text-muted">
        <summary>Sửa xác nhận nhầm</summary>
        <p className="mt-2">Cần bỏ xác nhận nhầm trước khi đổi sang Không ăn.</p>
        {admin ? <Link className="text-button" href={`/khac/quan-tri/bua-toi?date=${date}`}>Mở công cụ quản trị</Link>
          : <p className="mt-2">Hãy nhờ quản trị viên gia đình sửa giúp.</p>}
      </details>
    </> : <>
      {!planner && <p className="mb-3">Bữa tối: <strong>{plan==="eating"?"Có ăn":plan==="not_eating"?"Không ăn":"Chưa báo"}</strong></p>}
      {editable && planner && <div className="grid grid-cols-2 gap-2">
        {(["eating","not_eating",...(date < DINNER_DEFAULT_FROM ? ["unknown"] : [])] as DinnerPlan[]).map(choice=><button
          key={choice} type="button" aria-pressed={plan===choice} disabled={pending}
          className={`button ${plan===choice?"button-primary":"button-secondary"}`}
          onClick={()=>run(()=>setDinnerPlan(date,choice))}>
          {choice==="eating"?"Ăn":choice==="not_eating"?"Không ăn":"Chưa báo"}
        </button>)}
      </div>}
      {editable && !planner && <button className="button button-secondary mb-3 w-full" disabled={pending}
        onClick={()=>run(()=>setDinnerPlan(date,plan==="eating"?"not_eating":"eating"))}>
        {plan==="eating"?"Không ăn":"Có ăn"}
      </button>}
      {!editable && <p className="text-sm text-muted">{plan==="eating"?"Có ăn • Chưa ăn":plan==="not_eating"?"Không ăn":"Chưa báo"} · Chỉ xem</p>}
      {!planner && plan==="eating" && date===today &&
        <button className="button button-primary w-full" disabled={pending} onClick={()=>run(()=>checkInDinner(date))}>🍽 Tôi đã ăn</button>}
    </>}
    {pending && <p role="status" className="mt-2 text-sm text-muted">Đang lưu…</p>}
    {result && <p role={result.ok?"status":"alert"} className={`mt-2 text-sm ${result.ok?"text-teal":"text-red-800"}`}>{result.message}</p>}
  </div>;
}
