import type { Metadata, Viewport } from "next";
import { AppShell } from "@/components/app-shell";
import { PrototypeProvider } from "@/components/prototype-provider";
import { localDate } from "@/lib/mock-data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nhà Mình · Bản xem thử",
  description: "Giao diện mẫu cho việc bếp, bữa tối và việc nhà của gia đình.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f6f8f8" };

// The date is calculated once on the server to avoid browser timezone/hydration differences.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><PrototypeProvider today={localDate(new Date())}><AppShell>{children}</AppShell></PrototypeProvider></body></html>;
}
