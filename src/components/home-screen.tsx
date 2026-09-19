"use client";

import type { ReactNode } from "react";
import { CookingPot, ArrowRight, Check, X } from "lucide-react";
import { useRef } from "react";
import { dateLabel, households } from "@/lib/mock-data";
import { usePrototype } from "./prototype-provider";
import { Card, CardHeading } from "./ui";

import type { FamilyProfile } from "@/lib/auth/profile";

export function HomeScreen({ profile, kitchen, dinner, housework }: { profile: FamilyProfile; kitchen: ReactNode; dinner: ReactNode; housework: ReactNode }) {
  const state = usePrototype();
  const foodDialog = useRef<HTMLDialogElement>(null);
  const food = state.foodBatches.at(-1)!;
  const nextHousehold = households[(food.householdIndex + 1) % households.length];

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
      <p className="preview-note">Bếp, bữa tối và việc nhà dùng dữ liệu thật. Đồ ăn nhà gửi vẫn là dữ liệu mẫu.</p>
      {kitchen}

      {dinner}

      {housework}

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
