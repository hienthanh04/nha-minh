import { requireProfile } from "@/lib/auth/session";
import { ProfileEditor } from "@/components/profile-editor";
import { Card, PageHeading } from "@/components/ui";

export default async function ProfilePage() {
  const profile = await requireProfile();
  return <>
    <PageHeading eyebrow="Góc nhỏ của bạn" title="Hồ sơ của bạn" description="Đổi tên và ảnh đại diện mọi người trong nhà sẽ thấy." />
    <Card><ProfileEditor key={profile.updated_at} profile={profile} /></Card>
  </>;
}
