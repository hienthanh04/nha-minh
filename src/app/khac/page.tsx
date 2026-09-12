import { Heart, Users } from "lucide-react";
import { Card, CardHeading, PageHeading } from "@/components/ui";
import { members } from "@/lib/mock-data";

export default function MorePage() {
  return <>
    <PageHeading eyebrow="Góc nhỏ của gia đình" title="Nhà mình" />
    <div className="space-y-4">
      <Card>
        <CardHeading icon={Users} title="Năm thành viên" />
        <ul className="space-y-4">{members.map((member) => <li key={member.id} className="flex items-center gap-3">
          <span className={`avatar avatar-${member.color}`}>{member.initial}</span><span className="flex-1 font-semibold">{member.name}</span>{member.id === "thanh" && <span className="status status-success">Bạn đang xem</span>}
        </li>)}</ul>
      </Card>
      <Card>
        <CardHeading icon={Heart} title="Về bản xem thử" />
        <div className="space-y-3 text-sm leading-relaxed text-muted">
          <p>Cả năm thành viên và mọi lịch trong bản này đều là dữ liệu minh họa.</p>
          <p>Bạn có thể thử xác nhận công bếp, báo ăn, việc nhà và chuyển lượt gửi đồ. Khi đổi tab, các lựa chọn vẫn được giữ; tải lại trang sẽ đặt lại từ đầu.</p>
          <p>Bản này chưa lưu dữ liệu, chưa có đăng nhập hay quản trị.</p>
        </div>
      </Card>
    </div>
  </>;
}
