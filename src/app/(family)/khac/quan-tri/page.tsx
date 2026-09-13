import { requireAdmin } from "@/lib/auth/session";
import { Card, PageHeading } from "@/components/ui";

export default async function AdminPage() {
  const profile = await requireAdmin();
  return <>
    <PageHeading eyebrow="Chỉ dành cho quản trị viên" title="Quản trị gia đình" />
    <Card><p className="font-semibold">Xin chào {profile.display_name}.</p>
      <p className="mt-3 text-muted">Bạn có quyền quản trị. Các chức năng chỉnh sửa lịch và hồ sơ sẽ được bổ sung trong những phase sau.</p>
    </Card>
  </>;
}

