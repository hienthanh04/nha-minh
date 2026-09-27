# Cả nhà cùng phân công và sửa việc nhà — 27/09/2026

Đã bỏ “Góc nhỏ của gia đình” trên trang Khác và nhãn “Nhà mình mỗi ngày” ở thanh đầu trang.

Cả 5 thành viên đã đăng nhập và có profile đều thấy **Khác → Phân công & sửa việc nhà**. Có thể sửa thứ tự luân phiên, phân công tuần tương lai và thêm/sửa/bỏ xác nhận nhầm theo ngày. Link cũ `/khac/quan-tri/viec-nha` giữ nguyên để không làm hỏng đường dẫn đang dùng, nhưng riêng trang này nay dành cho cả gia đình.

Không đổi role ai thành admin. Người chưa đăng nhập và Auth account không có profile vẫn bị chặn. Các công cụ quản trị khác giữ quyền hiện có. Nút **Đã làm hôm nay** vẫn chỉ dành cho người phụ trách tuần đó; chỉnh sửa trong trang phân công là thao tác sửa nhầm riêng, có xác nhận. Tuần hiện tại đã phân công và các tuần quá khứ không đổi người phụ trách; sửa thứ tự không ghi đè các tuần đã tạo.

## Áp dụng lên app đang deploy

1. VS Code → mở `supabase/migrations/20260927000100_family_housework.sql`.
2. Copy toàn bộ file → đúng Supabase project gia đình → SQL Editor → New query → Run. **File đã có BEGIN/COMMIT**, không bọc thêm. Chỉ chạy file mới này, không chạy lại migration cũ. Không xóa/reset dữ liệu.
3. Chạy toàn bộ `supabase/verify-family-housework.sql` trong query mới. Cần đủ **5 dòng `passed = true`**. File verify chỉ đọc, không tạo người dùng thử.
4. Commit/push code lên nhánh `main`. Khi Vercel deployment mới **Ready**, tải lại app.
5. Đăng nhập một tài khoản `member`, vào Khác: thấy nút Phân công & sửa việc nhà. Chọn một tuần tương lai để sửa; lưu rồi tải lại để kiểm tra. Thử sửa xác nhận nhầm khi thật sự có sai; dữ liệu production sẽ lưu thật.

Nếu app báo chưa có cập nhật quyền việc nhà, kiểm tra migration ở bước 2 đã chạy đúng project chưa. Không cần mở signup, tắt RLS hoặc cấp admin cho mọi người.

## Cách bảo vệ dữ liệu

- Migration thay điều kiện hai RPC cấu hình từ admin sang thành viên gia đình; giữ nguyên kiểm tra 5 người, ngày thứ Hai, tuần tương lai, lịch sử và timestamp tránh ghi đè.
- RPC mới `housework_correct` lấy người phụ trách từ tuần đã lưu, không nhận member ID tùy ý từ client; kiểm tra thành viên, ngày/giờ không tương lai và giá trị cũ trước khi sửa/xóa.
- Giữ nguyên RLS và giới hạn ghi trực tiếp của member. Không mở quyền sửa bảng tùy ý để thực hiện tính năng này.
- Tests dùng database PGlite tạm: quyền member cấu hình/sửa, từ chối tài khoản ngoài gia đình/anonymous, không đổi role, ngày tương lai, sửa cũ không ghi đè, giữ đúng người được ghi nhận. Không chạy `supabase/tests/housework.sql` lên project gia đình.

Chưa chạy migration từ xa hay commit/push tự động. Kiểm tra app production bằng account member cần thực hiện sau hai bước migration và deploy.

Kiểm tra cục bộ đạt: toàn bộ database suite (gồm 55 kiểm tra việc nhà và 5 kiểm tra cấu trúc quyền mới), 12 kiểm tra render/integration, lint, typecheck và production build trên Node 24.19.0.
