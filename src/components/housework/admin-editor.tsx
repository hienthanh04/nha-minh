"use client";
import { vietnamDateTimeInput, correctedVietnamTimestamp } from "@/lib/date-format";
import { useState } from "react";
import { saveHouseworkRotation, assignHouseworkWeek, correctHousework } from "@/lib/housework/actions";
import { validateOrder, rotationPosition, type HouseworkMember, type HouseworkWeek } from "@/lib/housework/rules";
import { addDays, dateText, mondayOf, timeText } from "@/lib/date-format";
import { HouseworkFeedback, useHouseworkAction } from "./controls";

export function RotationEditor({ week, members, initial, effective }: {
  week: string; members: HouseworkMember[]; initial: string[]; effective: string | null;
}) {
  const [order, setOrder] = useState(initial.length === 5 ? initial : Array<string>(5).fill(""));
  const action = useHouseworkAction();
  const invalid = validateOrder(order, members);
  return <form className="space-y-3" action={() => action.run(() => saveHouseworkRotation(week, order))} aria-busy={action.pending}>
    <p className="text-sm text-muted">Thứ tự đang áp dụng: {effective ?? "Chưa có"}. Lưu bản mới từ {dateText(week)}. Lần đầu có thể bắt đầu tuần này; lần sau chọn tuần tương lai.</p>
    <p className="text-sm text-muted">Tuần đã có phân công được giữ nguyên. Dùng mục sửa riêng bên dưới nếu muốn đổi một tuần tương lai đã tạo.</p>
    {order.map((id, index) => <label key={index} className="block text-sm">Vị trí {index + 1}
      <select value={id} disabled={action.pending} className="auth-input mt-1" onChange={e => setOrder(order.map((member, i) => i === index ? e.target.value : member))}>
        <option value="">Chọn thành viên</option>
        {members.map(member => <option key={member.id} value={member.id}>{member.display_name}</option>)}
      </select>
    </label>)}
    {invalid && <p className="text-sm text-muted">{invalid}</p>}
    {!invalid && <details className="text-sm"><summary>Xem trước 6 tuần theo thứ tự này</summary>
      <ul className="mt-2 space-y-2">{Array.from({ length: 6 }, (_, i) => {
        const date = addDays(week, 7 * i);
        return <li key={date}>{dateText(date)}: {members.find(m => m.id === order[rotationPosition(week, date)!])?.display_name}</li>;
      })}</ul>
      <p className="mt-2 text-muted">Đây là dự kiến theo thứ tự, không thay thế phân công đã lưu.</p>
    </details>}
    <button disabled={action.pending || !!invalid} className="button button-primary w-full">Lưu thứ tự từ tuần này</button>
    <HouseworkFeedback {...action} />
  </form>;
}

export function AssignmentEditor({ week, today, assignment, members }: {
  week: string; today: string; assignment: HouseworkWeek | undefined; members: HouseworkMember[];
}) {
  const action = useHouseworkAction();
  const blocked = week < mondayOf(today) || (week === mondayOf(today) && !!assignment) || members.length !== 5;
  return <form className="space-y-3" action={form => action.run(() => assignHouseworkWeek(week, String(form.get("member")), assignment?.updated_at ?? null))}>
    <p className="text-sm text-muted">Chỉ đổi phân công của tuần tương lai. Tuần hiện tại chỉ được thiết lập khi chưa có phân công; không sửa người phụ trách trong lịch sử.</p>
    <label className="block text-sm">Người phụ trách
      <select key={assignment?.updated_at ?? week} name="member" defaultValue={assignment?.responsible_member_id ?? ""} required disabled={blocked || action.pending} className="auth-input mt-1">
        <option value="">Chọn thành viên</option>
        {members.map(member => <option key={member.id} value={member.id}>{member.display_name}</option>)}
      </select>
    </label>
    <button disabled={blocked || action.pending} className="button button-secondary w-full">Lưu phân công riêng</button>
    <HouseworkFeedback {...action} />
  </form>;
}

export function HouseworkCorrection({ date, at }: { date: string; at: string | null }) {
  const action = useHouseworkAction();
  return <div className="space-y-3">
    <p className="text-sm">{at ? `✅ Đã làm lúc ${timeText(at)}` : "Chưa xác nhận"}</p>
    <form className="space-y-3" action={form => action.run(() => correctHousework(date, at, correctedVietnamTimestamp(String(form.get("at")), at)))}>
      <label className="block text-sm">Thời điểm thực tế · giờ Việt Nam
        <input key={at ?? "empty"} type="datetime-local" name="at" required disabled={action.pending} className="auth-input mt-1 min-w-0"
          defaultValue={vietnamDateTimeInput(at)} />
      </label>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={action.pending} />Tôi xác nhận thời điểm này là đúng.</label>
      <button className="button button-secondary w-full" disabled={action.pending}>Lưu sửa xác nhận</button>
    </form>
    {at && <form className="space-y-3" action={() => action.run(() => correctHousework(date, at, null))}>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={action.pending} />Tôi xác nhận bỏ lần xác nhận nhầm này.</label>
      <button className="button button-secondary w-full" disabled={action.pending}>Bỏ xác nhận nhầm</button>
    </form>}
    <HouseworkFeedback {...action} />
  </div>;
}
