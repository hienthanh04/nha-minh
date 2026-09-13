"use client";

import Link from "next/link";
import { ChefHat, Utensils, Users, BrushCleaning, CookingPot, ArrowRight, Check, X } from "lucide-react";
import { useRef, useState } from "react";
import { currentUser, dateLabel, dinnerStatus, houseworkMember, households, memberName, members } from "@/lib/mock-data";
import { usePrototype } from "./prototype-provider";
import { Card, CardHeading, Completed } from "./ui";
import { DutyCard } from "./duty-card";
import type { FamilyProfile } from "@/lib/auth/profile";

export function HomeScreen({ profile }: { profile: FamilyProfile }) {
  const state = usePrototype();
  const [changingDinner, setChangingDinner] = useState(false);
  const foodDialog = useRef<HTMLDialogElement>(null);
  const ownDuties = state.duties.filter((duty) => duty.date === state.kitchenDate && (duty.delegatedTo ?? duty.assignedTo) === currentUser.id);
  const myPlan = state.dinnerPlans[currentUser.id];
  const myCheckin = state.dinnerCheckins[currentUser.id];
  const food = state.foodBatches.at(-1)!;
  const nextHousehold = households[(food.householdIndex + 1) % households.length];
  const waitingForDinner = members.filter((member) => state.dinnerPlans[member.id] === "eating" && !state.dinnerCheckins[member.id]).length;

  return <>
    <header className="mb-6 flex items-center justify-between gap-4">
      <div>
        <p className="mb-1.5 text-sm capitalize text-muted">{dateLabel(state.today)}</p>
        <h1 className="text-[1.8rem] font-bold leading-tight tracking-tight">Chào {profile.display_name} <span className="text-[1.5rem]" aria-hidden="true">☀️</span></h1>
        <p className="mt-2 text-sm text-muted">Cùng chăm chút cho nhà mình.</p>
      </div>
      <span className="avatar avatar-teal avatar-large" aria-label={profile.display_name}>{profile.display_name.trim().slice(0, 1).toUpperCase()}</span>
    </header>

    <div className="space-y-4">
      <p className="preview-note">Bạn đã đăng nhập. Các thẻ bên dưới vẫn là dữ liệu mẫu, thao tác chưa lưu vào gia đình.</p>
      <Card className="kitchen-card">
        <CardHeading icon={ChefHat} title="Việc của bạn hôm nay">
          <Link href="/lich" className="small-link" aria-label="Xem lịch công bếp"><ArrowRight size={20} /></Link>
        </CardHeading>
        {state.kitchenDate !== state.today && <p className="preview-note mb-4">Cuối tuần không có công bếp. Thử giao diện ngày {dateLabel(state.kitchenDate, true)} bên dưới.</p>}
        {ownDuties.length ? ownDuties.map((duty) => <DutyCard key={duty.id} duty={duty} />)
          : <p className="py-3 text-sm leading-relaxed text-muted">Hôm nay bạn không có công nấu/rửa.</p>}
      </Card>

      <Card>
        <CardHeading icon={Utensils} title="Bữa tối của bạn" />
        <div aria-live="polite">
          {myCheckin ? <Completed at={myCheckin} label="Đã ăn" /> : <>
            {myPlan === "unknown" || changingDinner ? <>
              <p className="mb-4">Tối nay bạn có ăn không?</p>
              <div className="grid grid-cols-2 gap-3">
                <button className="button button-primary" onClick={() => { state.setDinnerPlan("eating"); setChangingDinner(false); }}>Ăn</button>
                <button className="button button-secondary" onClick={() => { state.setDinnerPlan("not_eating"); setChangingDinner(false); }}>Không ăn</button>
              </div>
            </> : <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-x-2">
                <p className="text-sm">Bạn đã báo: <strong>{myPlan === "eating" ? "Có ăn" : "Không ăn"}</strong></p>
                <button className="text-button" onClick={() => setChangingDinner(true)}>Đổi lựa chọn</button>
              </div>
              {myPlan === "eating" && <button className="button button-primary w-full" onClick={state.checkInDinner}><Utensils size={18} aria-hidden="true" />Tôi đã ăn</button>}
            </>}
          </>}
        </div>
      </Card>

      <Card>
        <CardHeading icon={Users} title="Cả nhà ăn tối" />
        <ul className="family-list" aria-label="Trạng thái bữa tối của 5 thành viên">
          {members.map((member) => {
            const status = dinnerStatus(state.dinnerPlans[member.id], state.dinnerCheckins[member.id]);
            return <li key={member.id} className="family-row">
              <span className={`avatar avatar-${member.color}`} aria-hidden="true">{member.initial}</span>
              <span className="flex-1 font-semibold">{member.name}{member.id === currentUser.id && <span className="ml-1.5 text-xs font-normal text-muted">Bạn</span>}</span>
              <span className={`status status-${status.tone}`}><span aria-hidden="true">{status.icon}</span>{status.label}</span>
            </li>;
          })}
        </ul>
        <p className="save-food-note" aria-live="polite"><CookingPot size={17} aria-hidden="true" />{waitingForDinner > 0 ? `Nhớ để phần cho ${waitingForDinner} người chưa ăn nhé.` : "Đã đủ phần cho những người báo ăn."}</p>
      </Card>

      <Card>
        <CardHeading icon={BrushCleaning} title="Việc nhà tuần này" />
        <div className="mb-4 flex items-center gap-3">
          <span className="task-emoji" aria-hidden="true">🧹</span>
          <div><p className="font-semibold">{houseworkMember === currentUser.id ? "Tuần này tới lượt bạn" : memberName(houseworkMember)}</p>
            <p className="mt-1 text-sm text-muted">{dateLabel(state.days[0], true)} – {dateLabel(state.days[6], true)}</p></div>
        </div>
        {state.houseworkAt ? <Completed at={state.houseworkAt} /> : houseworkMember === currentUser.id
          ? <button className="button button-secondary w-full" onClick={state.checkInHousework}><Check size={18} aria-hidden="true" />Đã làm hôm nay</button>
          : <p className="text-sm text-muted">Hôm nay chưa xác nhận.</p>}
      </Card>

      <Card>
        <CardHeading icon={CookingPot} title="Đồ ăn nhà gửi" />
        <div className="food-route">
          <div className="min-w-0 flex-1"><p className="mb-1.5 text-sm text-muted">{food.status === "active" ? "Đang dùng" : "Đang chờ đồ từ"}</p><p className="text-lg font-bold">{households[food.householdIndex]}</p></div>
          <ArrowRight className="shrink-0 text-muted" size={19} aria-hidden="true" />
          <div className="min-w-0 flex-1"><p className="mb-1.5 text-sm text-muted">Tiếp theo</p><p className="text-lg font-bold">{nextHousehold}</p></div>
        </div>
        {food.status === "active"
          ? <button className="button button-secondary mt-4 w-full" onClick={() => foodDialog.current?.showModal()}>Đồ ăn đã hết</button>
          : <button className="button button-primary mt-4 w-full" onClick={state.receiveFood}><Check size={18} aria-hidden="true" />Đã gửi đồ</button>}
      </Card>
    </div>

    <dialog ref={foodDialog} className="dialog" aria-labelledby="food-dialog-title" aria-describedby="food-dialog-description">
      <div className="mb-3 flex items-center justify-between gap-3"><h2 id="food-dialog-title" className="text-xl font-bold">Đồ ăn đã hết?</h2><button className="icon-button" aria-label="Đóng xác nhận" onClick={() => foodDialog.current?.close()}><X size={20} /></button></div>
      <p id="food-dialog-description" className="mb-6 leading-relaxed text-muted">Kết thúc đợt của {households[food.householdIndex]} và chuyển sang chờ đồ từ {nextHousehold}.</p>
      <div className="grid grid-cols-2 gap-3">
        <button className="button button-secondary" autoFocus onClick={() => foodDialog.current?.close()}>Chưa, quay lại</button>
        <button className="button button-primary" onClick={() => { state.finishFood(); foodDialog.current?.close(); }}>Đúng, đã hết</button>
      </div>
    </dialog>
  </>;
}
