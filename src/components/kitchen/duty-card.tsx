"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeDuty, delegateDuty, correctDuty, type KitchenResult } from "@/lib/kitchen/actions";
import { dateText, timeText, vietnamToday, responsibleId, type KitchenDuty, type KitchenMember } from "@/lib/kitchen/rules";

export function KitchenDutyCard({ duty, members, userId, admin, today }: {
  duty: KitchenDuty; members: KitchenMember[]; userId: string; admin: boolean; today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const busy = useRef(false);
  const [message, setMessage] = useState<KitchenResult | null>(null);
  const name = (id: string | null) => members.find(m => m.id === id)?.display_name ?? "Thành viên";
  function run(action: () => Promise<KitchenResult>) {
    if (busy.current) return;
    busy.current = true;
    setMessage(null);
    startTransition(async () => {
      try { setMessage(await action()); }
      catch { setMessage({ok:false,message:"Chưa lưu được. Kiểm tra kết nối rồi tải lại để xem trạng thái mới nhất."}); }
      finally { busy.current = false; router.refresh(); }
    });
  }
  return <article className="duty-item py-2" aria-busy={pending}>
    <div className="flex items-start gap-3">
      <span className="task-emoji" aria-hidden="true">{duty.duty_type === "cook" ? "🍳" : "🍽"}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{duty.duty_type === "cook" ? `Nấu ăn · ${duty.slot_number}` : "Rửa chén"}</h3>
        <p className="mt-1 text-sm text-muted">Phân công: {name(duty.assigned_to)}</p>
        {duty.delegated_to && <p className="mt-1 text-sm text-teal">{duty.delegated_to === userId ? `Làm thay cho ${name(duty.assigned_to)}` : `${name(duty.delegated_to)} làm thay`}</p>}
      </div>
    </div>
    {duty.status === "completed" && duty.completed_at
      ? <p role="status" className="completed mt-3">✅ Đã làm lúc {timeText(duty.completed_at)} · {name(duty.completed_by)}</p>
      : <div className="mt-3">
        <p className="mb-2 text-sm text-muted">Chưa xác nhận</p>
        {responsibleId(duty) === userId && duty.date <= today &&
          <button className="button button-primary w-full" disabled={pending} onClick={() => run(() => completeDuty(duty.id))}>{pending ? "Đang lưu…" : "Đã làm"}</button>}
        {duty.date > today && <p className="text-sm text-muted">Chưa tới ngày thực hiện.</p>}
      </div>}
    {message && <p role={message.ok ? "status" : "alert"} className={`mt-3 text-sm ${message.ok ? "text-teal" : "text-red-800"}`}>{message.message}</p>}
    <details className="mt-2">
      <summary className="text-sm text-teal">Chi tiết công · {dateText(duty.date)}</summary>
      <p className="my-3 text-sm text-muted">Người phụ trách: {name(responsibleId(duty))}</p>
      {duty.completed_at && <p className="mb-3 text-sm text-muted">Xác nhận: {dateText(vietnamToday(new Date(duty.completed_at)))} · {timeText(duty.completed_at)} (giờ Việt Nam). Công tính theo ngày {dateText(duty.date)}.</p>}
      {duty.assigned_to === userId && duty.status === "unconfirmed" && <form action={form => {
        const target = String(form.get("member") ?? "");
        run(() => delegateDuty(duty.id, target || null, duty.updated_at));
      }} className="space-y-3">
        <label className="block text-sm font-semibold">Nhờ người khác làm hộ
          <select key={duty.delegated_to ?? "none"} name="member" defaultValue={duty.delegated_to ?? ""} disabled={pending} className="auth-input mt-2">
            <option value="">Tự làm / Hủy nhờ làm hộ</option>
            {members.filter(m => m.id !== userId).map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
          </select>
        </label>
        <button className="button button-secondary w-full" disabled={pending}>Xác nhận lựa chọn</button>
      </form>}
      {admin && <details className="mt-3 rounded-xl bg-slate-50 p-3">
        <summary className="text-sm">Quản trị viên: sửa xác nhận</summary>
        <form className="mt-3 space-y-3" action={form => {
          const member = String(form.get("completer") ?? "");
          const at = String(form.get("at") ?? "");
          if (member && !at) { setMessage({ok:false,message:"Hãy nhập thời điểm xác nhận."}); return; }
          run(() => correctDuty(duty.id, duty.updated_at, member || null, member ? at + ":00+07:00" : null));
        }}>
          <p className="text-sm text-muted">Chỉ sửa khi ghi nhận nhầm. Phân công gốc và nhờ làm hộ được giữ nguyên.</p>
          <label className="block text-sm">Người thực sự làm
            <select key={duty.completed_by ?? "unconfirmed"} name="completer" defaultValue={duty.completed_by ?? ""} className="auth-input mt-1" disabled={pending}>
              <option value="">Chưa xác nhận (xóa xác nhận nhầm)</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.display_name}</option>)}
            </select>
          </label>
          <label className="block text-sm">Thời điểm xác nhận · giờ Việt Nam
            <input key={duty.completed_at ?? "no-time"} type="datetime-local" name="at" disabled={pending}
              defaultValue={duty.completed_at ? new Date(new Date(duty.completed_at).getTime()+7*3600000).toISOString().slice(0,16) : ""}
              className="auth-input mt-1 min-w-0" />
          </label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" required disabled={pending} className="mt-1" />Tôi xác nhận chỉnh sửa bản ghi này.</label>
          <button disabled={pending} className="button button-secondary w-full">Lưu sửa xác nhận</button>
        </form>
      </details>}
    </details>
  </article>;
}
