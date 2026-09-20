"use client";
import { vietnamDateTimeInput, correctedVietnamTimestamp } from "@/lib/date-format";
import { useState } from "react";
import { correctFood, initializeFood, saveFoodHouseholds } from "@/lib/food/actions";
import { validateHouseholds, type FoodBatch, type FoodHousehold, type HouseholdInput } from "@/lib/food/rules";
import { FoodFeedback, useFoodAction } from "./controls";

export function HouseholdEditor({ households }: { households: FoodHousehold[] }) {
  const [items, setItems] = useState<HouseholdInput[]>(households);
  const action = useFoodAction();
  const invalid = validateHouseholds(items);
  const enabledCount = items.filter(item => item.is_enabled).length;
  function change(index: number, values: Partial<HouseholdInput>) {
    setItems(items.map((item, i) => i === index ? { ...item, ...values } : item));
  }
  return <form className="space-y-4" action={() => action.run(() => saveFoodHouseholds(items))}>
    <p className="text-sm font-semibold" aria-live="polite">Danh sách đang chỉnh: {enabledCount} nhà tham gia gửi đồ</p>
    <p className="text-sm text-muted">Số nhỏ gửi trước, hết danh sách quay về đầu. Bỏ nhà khỏi vòng gửi đồ rồi bấm Lưu để áp dụng. Lịch sử và đợt đang chờ/đang dùng giữ nguyên; các lượt tiếp theo sẽ bỏ qua nhà đã ngừng.</p>
    {items.map((item, index) => <fieldset key={item.id ?? `new-${index}`} disabled={action.pending} className="space-y-3 rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-sm">Nhà gửi đồ {index + 1}</legend>
      <label className="block text-sm">Tên nhà<input className="auth-input mt-1" value={item.name} maxLength={100} required onChange={e => change(index, { name: e.target.value })} /></label>
      <label className="block text-sm">Thứ tự<input type="number" min={1} step={1} required className="auth-input mt-1" value={item.rotation_position + 1} onChange={e => change(index, { rotation_position: Number(e.target.value) - 1 })} /></label>
      <p className="text-sm text-muted">{item.is_enabled ? "Đang tham gia gửi đồ" : "Đã bỏ khỏi vòng gửi đồ · Giữ lại lịch sử"}</p>
      {item.id === null ? <button type="button" className="button button-secondary w-full" onClick={() => setItems(items.filter((_, i) => i !== index))}>Bỏ dòng chưa lưu</button>
        : <button type="button" className="button button-secondary w-full" disabled={action.pending || (item.is_enabled && enabledCount === 1)} onClick={() => change(index, { is_enabled: !item.is_enabled })}>{item.is_enabled ? "Bỏ khỏi vòng gửi đồ" : "Thêm lại vào vòng gửi đồ"}</button>}
      {item.id !== null && item.is_enabled && enabledCount === 1 && <p className="text-sm text-muted">Cần giữ ít nhất một nhà tham gia gửi đồ.</p>}
    </fieldset>)}
    <button type="button" disabled={action.pending} className="button button-secondary w-full" onClick={() => setItems([...items, { id: null, name: "", is_enabled: true, rotation_position: Math.max(-1, ...items.map(h => h.rotation_position)) + 1, updated_at: null }])}>Thêm nhà gửi đồ</button>
    {invalid && <p className="text-sm text-muted">{invalid}</p>}
    <button disabled={action.pending || !!invalid} className="button button-primary w-full">Lưu danh sách và thứ tự</button>
    <FoodFeedback {...action} />
  </form>;
}
export function FoodInitializer({ households }: { households: FoodHousehold[] }) {
  const action = useFoodAction();
  return <form className="space-y-3" action={form => action.run(() => initializeFood(String(form.get("household"))))}>
    <label className="block text-sm">Nhà gửi đầu tiên<select name="household" className="auth-input mt-1" defaultValue="" required disabled={action.pending}>
      <option value="">Chọn nhà để bắt đầu</option>
      {households.filter(h => h.is_enabled).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
    </select></label>
    <button className="button button-primary w-full" disabled={action.pending || !households.some(h => h.is_enabled)}>Khởi tạo lượt chờ</button>
    <FoodFeedback {...action} />
  </form>;
}
export function FoodCorrectionEditor({ batch, successor }: { batch: FoodBatch; successor: FoodBatch | null }) {
  const action = useFoodAction();
  const base = { status: batch.status, start: batch.start_date, finished: batch.finished_at, note: batch.note ?? "", successorExpected: successor?.updated_at ?? null };
  const displayedFinish = vietnamDateTimeInput(batch.finished_at);
  return <div className="space-y-4">
    <form className="space-y-3" action={form => {
      const finished = String(form.get("finished") ?? "");
      // Editing just the note must not round the original completion timestamp to a minute.
      const finishedAt = correctedVietnamTimestamp(finished, batch.finished_at);
      action.run(() => correctFood(batch.id, batch.updated_at, { ...base, start: String(form.get("start") ?? "") || null, finished: finishedAt, note: String(form.get("note") ?? "") }));
    }}>
      {batch.status !== "waiting" && <label className="block text-sm">Ngày nhận · Việt Nam<input type="date" name="start" required defaultValue={batch.start_date ?? ""} className="auth-input mt-1" disabled={action.pending} /></label>}
      {batch.status === "finished" && <label className="block text-sm">Thời điểm hết · giờ Việt Nam<input type="datetime-local" name="finished" required defaultValue={displayedFinish} className="auth-input mt-1 min-w-0" disabled={action.pending} /></label>}
      <label className="block text-sm">Ghi chú (không bắt buộc)<textarea name="note" defaultValue={batch.note ?? ""} maxLength={500} className="auth-input mt-1" rows={2} disabled={action.pending} /></label>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={action.pending} />Tôi xác nhận thông tin sửa là đúng.</label>
      <button className="button button-secondary w-full" disabled={action.pending}>Lưu ngày / ghi chú</button>
    </form>
    {batch.status === "active" && <form className="space-y-3" action={() => action.run(() => correctFood(batch.id, batch.updated_at, { ...base, status: "waiting", start: null, finished: null }))}>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={action.pending} />Đã bấm nhận nhầm; đợt này thực tế vẫn đang chờ.</label>
      <button className="button button-secondary w-full" disabled={action.pending}>Sửa về đang chờ</button>
    </form>}
    {batch.status === "finished" && successor?.status === "waiting" && <form className="space-y-3" action={() => action.run(() => correctFood(batch.id, batch.updated_at, { ...base, status: "active", finished: null }))}>
      <label className="flex gap-2 text-sm"><input type="checkbox" required disabled={action.pending} />Đã bấm hết nhầm. Mở lại đợt này và bỏ lượt chờ kế tiếp chưa nhận.</label>
      <button className="button button-secondary w-full" disabled={action.pending}>Mở lại đợt chưa hết</button>
    </form>}
    {batch.status === "finished" && successor?.status !== "waiting" && <p className="text-sm text-muted">Chỉ sửa ngày/ghi chú; không quay lui khi lượt kế tiếp đã được nhận hoặc không còn là lượt chờ hiện tại.</p>}
    <FoodFeedback {...action} />
  </div>;
}
