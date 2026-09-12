"use client";

import { Ellipsis, Check, X } from "lucide-react";
import { useRef } from "react";
import { currentUser, memberName, members, type MemberId, type MockDuty } from "@/lib/mock-data";
import { usePrototype } from "./prototype-provider";
import { Completed } from "./ui";

export function DutyCard({ duty }: { duty: MockDuty }) {
  const { completeDuty, delegateDuty } = usePrototype();
  const dialog = useRef<HTMLDialogElement>(null);
  const isResponsible = (duty.delegatedTo ?? duty.assignedTo) === currentUser.id;
  const canDelegate = duty.assignedTo === currentUser.id && !duty.completedAt;

  return <div className="duty-item">
    <div className="flex items-center gap-3">
      <span className="task-emoji" aria-hidden="true">{duty.type === "cook" ? "🍳" : "🍽️"}</span>
      <div className="min-w-0 flex-1">
        <h3 className="font-bold">{duty.type === "cook" ? "Nấu ăn" : "Rửa chén"}</h3>
        <p className="mt-0.5 text-sm text-muted">{duty.delegatedTo
          ? `Làm thay cho ${memberName(duty.assignedTo)}` : "Bữa tối của cả nhà"}</p>
      </div>
      <button type="button" className="icon-button" aria-label={`Chi tiết ${duty.type === "cook" ? "nấu ăn" : "rửa chén"}`}
        onClick={() => dialog.current?.showModal()}><Ellipsis size={21} /></button>
    </div>
    <div className="mt-4">{duty.completedAt ? <Completed at={duty.completedAt} /> : isResponsible &&
      <button type="button" className="button button-primary w-full" onClick={() => completeDuty(duty.id)}><Check size={18} aria-hidden="true" />Đã làm</button>}
    </div>
    <dialog ref={dialog} className="dialog" aria-labelledby={`duty-title-${duty.id}`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id={`duty-title-${duty.id}`} className="text-xl font-bold">Chi tiết công bếp</h2>
        <button type="button" className="icon-button" aria-label="Đóng chi tiết" onClick={() => dialog.current?.close()}><X size={20} /></button>
      </div>
      <p>Phân công ban đầu: <strong>{memberName(duty.assignedTo)}</strong></p>
      <p className="mt-2 text-muted">{duty.completedBy ? `Đã làm: ${memberName(duty.completedBy)}` : "Chưa xác nhận"}</p>
      {canDelegate && <div className="mt-5">
        <label htmlFor={`delegate-${duty.id}`} className="mb-2 block font-semibold">Nhờ người khác làm hộ</label>
        <select id={`delegate-${duty.id}`} defaultValue={duty.delegatedTo ?? ""}
          onChange={(event) => { delegateDuty(duty.id, (event.target.value || null) as MemberId | null); dialog.current?.close(); }}>
          <option value="">Tự làm</option>
          {members.filter((member) => member.id !== currentUser.id).map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
        </select>
        <p className="mt-3 text-sm text-muted">Người làm hộ sẽ được tính công. Lựa chọn này chỉ thay đổi dữ liệu mẫu.</p>
      </div>}
    </dialog>
  </div>;
}
