import { Check, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { timeLabel } from "@/lib/mock-data";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

export function CardHeading({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children?: ReactNode }) {
  return <div className="mb-4 flex items-center gap-3">
    <Icon size={20} className="text-teal" aria-hidden="true" />
    <h2 className="min-w-0 flex-1 text-lg font-bold tracking-tight">{title}</h2>
    {children}
  </div>;
}

export function Completed({ at, label = "Đã làm" }: { at: string; label?: string }) {
  return <p role="status" className="completed"><Check size={18} aria-hidden="true" />{label} lúc {timeLabel(at)}</p>;
}

export function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <header className="mb-6">
    <p className="eyebrow mb-2">{eyebrow}</p>
    <h1 className="text-[1.8rem] font-bold leading-tight tracking-tight">{title}</h1>
    {description && <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>}
  </header>;
}
