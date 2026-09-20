"use client";

import { DataRefresh } from "./data-refresh";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, History, House, Ellipsis, Heart } from "lucide-react";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", label: "Hôm nay", icon: House },
  { href: "/lich", label: "Lịch", icon: CalendarDays },
  { href: "/lich-su", label: "Lịch sử", icon: History },
  { href: "/khac", label: "Khác", icon: Ellipsis },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Đến nội dung</a>
    <div className="brand-bar">
      <Link href="/" className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight" aria-label="Gia tộc Trần Anh — Hôm nay">
        <span className="brand-mark"><House size={18} strokeWidth={2.3} aria-hidden="true" /></span>Gia tộc Trần Anh<span className="text-orange"><Heart size={13} fill="currentColor" aria-hidden="true" /></span>
      </Link>
      <span className="family-badge">Nhà mình mỗi ngày</span>
    </div>
    <DataRefresh />
    <main id="main-content" className="px-5 pb-8 pt-5 sm:px-7" tabIndex={-1}>{children}</main>
    <p className="px-5 pb-7 text-center text-xs text-muted">Cùng chăm chút cho nhà mình mỗi ngày</p>
    <nav aria-label="Điều hướng chính" className="bottom-nav">
      {navigation.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
        return <Link key={href} href={href}
        aria-current={active ? "page" : undefined}
        className={`nav-item ${active ? "nav-active" : ""}`}>
        <span className="nav-icon"><Icon size={22} strokeWidth={active ? 2.4 : 1.8} aria-hidden="true" /></span>
        <span>{label}</span>
      </Link>;})}
    </nav>
  </div>;
}
