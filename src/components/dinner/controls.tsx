"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { checkInDinner, setDinnerPlan, type DinnerResult } from "@/lib/dinner/actions";
import { timeText } from "@/lib/kitchen/rules";
import type { DinnerPlan } from "@/lib/dinner/rules";

export function DinnerControls({date,today,plan,at,planner=false,admin=false}: {
  date:string;today:string;plan:DinnerPlan;at:string|null;planner?:boolean;admin?:boolean;
}) {
  const [changing,setChanging]=useState(false);
  const [result,setResult]=useState<DinnerResult|null>(null);
  const [pending,startTransition]=useTransition();
  const busy=useRef(false);
  const router=useRouter();
  const editable=date>=today;
  function run(operation:()=>Promise<DinnerResult>) {
    if (busy.current) return;
    busy.current=true;setResult(null);
    startTransition(async()=>{
      try {
        const next=await operation();setResult(next);
        if (next.ok) setChanging(false);
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
      {!planner && (!changing && plan !== "unknown")
        ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p>Bạn đã báo: <strong>{plan==="eating"?"Có ăn":"Không ăn"}</strong></p>
          {editable && <button className="text-button" disabled={pending} onClick={()=>setChanging(true)}>Đổi lựa chọn</button>}
        </div> : !planner && <p className="mb-4">Tối nay bạn có ăn không?</p>}
      {editable && (planner || changing || plan==="unknown") && <div className={`grid gap-2 ${planner?"grid-cols-3":"grid-cols-2"}`}>
        {(["eating","not_eating",...(planner ? ["unknown"] : [])] as DinnerPlan[]).map(choice=><button
          key={choice} type="button" aria-pressed={plan===choice} disabled={pending}
          className={`button ${plan===choice?"button-primary":"button-secondary"}`}
          onClick={()=>run(()=>setDinnerPlan(date,choice))}>
          {choice==="eating"?"Ăn":choice==="not_eating"?"Không ăn":"Chưa báo"}
        </button>)}
      </div>}
      {!editable && <p className="text-sm text-muted">{plan==="eating"?"Có ăn • Chưa ăn":plan==="not_eating"?"Không ăn":"Chưa báo"} · Chỉ xem</p>}
      {!planner && !changing && plan==="eating" && date===today &&
        <button className="button button-primary w-full" disabled={pending} onClick={()=>run(()=>checkInDinner(date))}>🍽 Tôi đã ăn</button>}
    </>}
    {pending && <p role="status" className="mt-2 text-sm text-muted">Đang lưu…</p>}
    {result && <p role={result.ok?"status":"alert"} className={`mt-2 text-sm ${result.ok?"text-teal":"text-red-800"}`}>{result.message}</p>}
  </div>;
}
