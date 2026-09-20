import { Avatar } from "@/components/avatar";
import { Heart, Users } from "lucide-react";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { requireProfile } from "@/lib/auth/session";
import { LogoutForm } from "@/components/auth-forms";

export default async function MorePage() {
  const profile = await requireProfile();
  const db = await createClient();
  const { data: members, error } = await db.from("profiles").select("id, display_name, avatar_path").order("member_slot");
  return <>
    <PageHeading eyebrow="Góc nhỏ của gia đình" title="Gia tộc Trần Anh" />
    <div className="space-y-4">
      <Card>
        <div className="mb-3"><Avatar id={profile.id} name={profile.display_name} path={profile.avatar_path} large /></div>
        <h2 className="text-lg font-bold">{profile.display_name}</h2>
        <Link className="button button-secondary my-3 w-full" href="/khac/ho-so">Hồ sơ của bạn</Link>
        <p className="mb-4 mt-2 text-muted">Thành viên số {profile.member_slot} · {profile.role === "admin" ? "Quản trị viên" : "Thành viên"}</p>
        {profile.role === "admin" && <Link className="button button-secondary mb-3 w-full" href="/khac/quan-tri">Quản trị gia đình</Link>}
        {profile.role === "admin" && <Link className="button button-secondary mb-3 w-full" href="/khac/quan-tri/bua-toi">Sửa bữa tối</Link>}
        {profile.role === "admin" && <Link className="button button-secondary mb-3 w-full" href="/khac/quan-tri/viec-nha">Phân công & sửa việc nhà</Link>}
        {profile.role === "admin" && <Link className="button button-secondary mb-3 w-full" href="/khac/quan-tri/do-an">Lượt gửi đồ ăn</Link>}
        <LogoutForm />
      </Card>
      <Card>
        <CardHeading icon={Users} title="Thành viên gia đình" />
        {error ? <p role="alert">Chưa tải được danh sách thành viên. Hãy tải lại.</p> : <ul className="space-y-4">{members?.map((member) => <li key={member.id} className="flex items-center gap-3">
          <Avatar id={member.id} name={member.display_name} path={member.avatar_path} /><span className="flex-1 font-semibold">{member.display_name}</span>{member.id === profile.id && <span className="status status-success">Bạn</span>}
        </li>)}</ul>}
      </Card>
      <Card>
        <CardHeading icon={Heart} title="Về Gia tộc Trần Anh" />
        <div className="space-y-3 text-sm leading-relaxed text-muted">
          <p>Lịch bếp, bữa tối, việc nhà và lượt gửi đồ ăn được lưu khi thao tác thành công và được giữ khi tải lại trang.</p>
        </div>
      </Card>
    </div>
  </>;
}
