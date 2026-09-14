import { Heart, Users } from "lucide-react";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { members } from "@/lib/mock-data";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { LogoutForm } from "@/components/auth-forms";

export default async function MorePage() {
  const profile = await requireProfile();
  return <>
    <PageHeading eyebrow="Góc nhỏ của gia đình" title="Nhà mình" />
    <div className="space-y-4">
      <Card>
        <h2 className="text-lg font-bold">{profile.display_name}</h2>
        <p className="mb-4 mt-2 text-muted">Thành viên số {profile.member_slot} · {profile.role === "admin" ? "Quản trị viên" : "Thành viên"}</p>
        {profile.role === "admin" && <Link className="button button-secondary mb-3 w-full" href="/khac/quan-tri">Quản trị gia đình</Link>}
        <LogoutForm />
      </Card>
      <Card>
        <CardHeading icon={Users} title="Năm thành viên minh họa" />
        <ul className="space-y-4">{members.map((member) => <li key={member.id} className="flex items-center gap-3">
          <span className={`avatar avatar-${member.color}`}>{member.initial}</span><span className="flex-1 font-semibold">{member.name}</span>{member.id === "thanh" && <span className="status status-success">Bạn đang xem</span>}
        </li>)}</ul>
      </Card>
      <Card>
        <CardHeading icon={Heart} title="Về bản xem thử" />
        <div className="space-y-3 text-sm leading-relaxed text-muted">
          <p>Đăng nhập, hồ sơ cá nhân và lịch bếp đã dùng dữ liệu thật trên Supabase. Công bếp đã lưu sẽ được giữ khi tải lại trang.</p>
          <p>Bữa tối, việc nhà, đồ ăn và danh sách minh họa bên trên vẫn là dữ liệu mẫu. Những thao tác mẫu sẽ đặt lại khi tải lại trang.</p>
        </div>
      </Card>
    </div>
  </>;
}
