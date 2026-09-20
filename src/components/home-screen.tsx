import { Avatar } from "@/components/avatar";


import type { ReactNode } from "react";
import { dateLabel } from "@/lib/date-format";
import type { FamilyProfile } from "@/lib/auth/profile";

export function HomeScreen({ profile, today, kitchen, dinner, housework, food }: { profile: FamilyProfile; kitchen: ReactNode; dinner: ReactNode; housework: ReactNode; food: ReactNode; today: string }) {

  return <>
    <header className="mb-6 flex items-center justify-between gap-4">
      <div>
        <p className="mb-1.5 text-sm capitalize text-muted">{dateLabel(today)}</p>
        <h1 className="text-[1.8rem] font-bold leading-tight tracking-tight">Chào {profile.display_name} <span className="text-[1.5rem]" aria-hidden="true">☀️</span></h1>
        <p className="mt-2 text-sm text-muted">Cùng chăm chút cho nhà mình.</p>
      </div>
      <Avatar id={profile.id} name={profile.display_name} path={profile.avatar_path} large />
    </header>

    <div className="space-y-4">
      {kitchen}

      {dinner}

      {housework}

      {food}
    </div>


  </>;
}
