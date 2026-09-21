import { Smartphone } from "lucide-react";
import { APP_NAME } from "@/lib/app-info";
import { Card, CardHeading } from "./ui";

export function InstallInstructions() {
  return <Card>
    <CardHeading icon={Smartphone} title="Thêm vào Màn hình chính" />
    <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed">
      <li>Mở đường dẫn app bằng Safari trên iPhone.</li>
      <li>Mở menu trang hoặc nút Chia sẻ, chọn <strong>Thêm vào Màn hình chính</strong>.</li>
      <li>Bật <strong>Mở dưới dạng ứng dụng web</strong> nếu có, rồi bấm <strong>Thêm</strong>.</li>
      <li>Mở biểu tượng <strong>{APP_NAME}</strong> trên màn hình chính và đăng nhập nếu được yêu cầu.</li>
    </ol>
    <p className="mt-3 text-sm text-muted">App cần kết nối mạng để tải và lưu dữ liệu. Khi có bản cập nhật thông thường, chỉ cần mở lại hoặc tải lại app, không cần cài lại.</p>
  </Card>;
}
