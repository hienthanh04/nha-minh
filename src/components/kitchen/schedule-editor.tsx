"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveKitchenSchedule, type KitchenResult } from "@/lib/kitchen/actions";
import { addDays, blankSlots, dateText, mondayOf, validateSlots, type KitchenSlot, type KitchenMember } from "@/lib/kitchen/rules";

export function ScheduleEditor({week, initial, members, template=false, today, blocked=false}: {
  week:string; initial:KitchenSlot[]; members:KitchenMember[]; template?:boolean; today:string; blocked?:boolean;
}) {
  const [slots,setSlots] = useState(initial.length === 15 ? initial : blankSlots());
  const [result,setResult] = useState<KitchenResult | null>(null);
  const [pending,startTransition] = useTransition();
  const busy=useRef(false);
  const router=useRouter();
  const missing = members.length !== 5;
  return <form className="space-y-4" action={form=>{
    if (busy.current) return;
    const validation = validateSlots(slots,members);
    if (validation) { setResult({ok:false,message:validation}); return; }
    busy.current=true;
    setResult(null);
    startTransition(async()=>{
      try {setResult(await saveKitchenSchedule(week,slots,template,form.get("correctPast")==="on"));}
      catch {setResult({ok:false,message:"Chưa lưu được. Kiểm tra kết nối rồi tải lại trước khi thử tiếp."});}
      finally {busy.current=false;router.refresh();}
    });
  }} aria-busy={pending}>
    {missing && <p role="alert" className="preview-note">Đang có {members.length}/5 hồ sơ. Hãy tạo đủ 5 hồ sơ gia đình trước khi phân công.</p>}
    {blocked && <p role="alert" className="preview-note">Tuần đã có xác nhận hoặc nhờ làm hộ. Không thể thay lịch cả tuần; mở từng công ở Lịch để sửa xác nhận nhầm.</p>}
    {template && <p className="preview-note">Mẫu lặp lại áp dụng từ {dateText(week)} cho các tuần chưa tạo. Giữ nguyên mọi tuần đã tạo, kể cả chỉnh sửa riêng. Muốn đổi một tuần đã tạo, dùng trình sửa lịch tuần.</p>}
    <div className="flex flex-wrap gap-2">{members.map(m=><span key={m.id} className="status status-warm">{m.display_name}: {slots.filter(s=>s.assigned_to===m.id).length}/3</span>)}</div>
    <fieldset disabled={pending || missing || blocked} className="space-y-4">
      {Array.from({length:5},(_,i)=>i+1).map(day=><div key={day} className="rounded-xl border border-slate-200 p-3">
        <h3 className="mb-3 font-bold">{dateText(addDays(week,day-1))}</h3>
        {slots.map((slot,index)=>slot.weekday===day && <label key={index} className="mb-3 block text-sm last:mb-0">
          {slot.duty_type==="cook" ? `🍳 Nấu ăn ${slot.slot_number}` : "🍽 Rửa chén"}
          <select value={slot.assigned_to} className="auth-input mt-1" required onChange={event=>setSlots(previous=>previous.map((s,i)=>i===index ? {...s,assigned_to:event.target.value}:s))}>
            <option value="">Chọn thành viên</option>
            {members.map(m=><option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>)}
      </div>)}
      {!template && week < mondayOf(today) && <label className="flex gap-2 text-sm"><input type="checkbox" name="correctPast" required/>Tôi xác nhận chỉnh sửa lịch quá khứ.</label>}
      {template && <label className="flex gap-2 text-sm"><input type="checkbox" required/>Tôi đã hiểu các tuần đã tạo sẽ được giữ nguyên.</label>}
      <button className="button button-primary w-full">{pending ? "Đang lưu…" : template ? "Lưu lịch mẫu lặp lại" : "Lưu lịch tuần · 15 công"}</button>
    </fieldset>
    {result && <p role={result.ok?"status":"alert"} className={`text-sm ${result.ok?"text-teal":"text-red-800"}`}>{result.message}</p>}
  </form>;
}

