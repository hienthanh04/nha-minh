"use client";

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
      <Link href="/" className="flex min-h-11 items-center gap-2.5 font-bold tracking-tight" aria-label="Nhà Mình — Hôm nay">
        <span className="brand-mark"><House size={18} strokeWidth={2.3} aria-hidden="true" /></span>Nhà Mình<span className="text-orange"><Heart size={13} fill="currentColor" aria-hidden="true" /></span>
      </Link>
      <span className="prototype-badge">Bản xem thử</span>
    </div>
    <main id="main-content" className="px-5 pb-8 pt-5 sm:px-7" tabIndex={-1}>{children}</main>
    <p className="pb-7 text-center text-xs text-muted">Dữ liệu mẫu · Tải lại trang để bắt đầu lại</p>
    <nav aria-label="Điều hướng chính" className="bottom-nav">
      {navigation.map(({ href, label, icon: Icon }) => <Link key={href} href={href}
        aria-current={pathname === href ? "page" : undefined}
        className={`nav-item ${pathname === href ? "nav-active" : ""}`}>
        <span className="nav-icon"><Icon size={22} strokeWidth={pathname === href ? 2.4 : 1.8} aria-hidden="true" /></span>
        <span>{label}</span>
      </Link>)}
    </nav>
  </div>;
}
