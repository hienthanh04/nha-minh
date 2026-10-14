# Cập nhật 14/10/2026

## Ăn tối

Từ 14/10, mặc định mọi người Có ăn, ai vắng bấm Không ăn; có thể chọn Có ăn lại.
“Tôi đã ăn” vẫn là xác nhận riêng. Không tự tạo xác nhận đã ăn.
Giữ nguyên Không ăn đã lưu và lịch sử trước 14/10. Lịch tuần và danh sách để phần
cùng dùng quy tắc mặc định. Nếu đã xác nhận ăn, phải bỏ xác nhận nhầm trước khi đổi lựa chọn.

1. Chạy toàn bộ `supabase/migrations/20261014000100_default_dinner.sql` trong
   Supabase SQL Editor. File đã có BEGIN/COMMIT; không chạy lại migration ban đầu.
2. Chạy `supabase/verify-october-update.sql`: mong đợi năm dòng `passed = true`.
3. Commit/push code lên main, chờ Vercel deployment của commit mới báo Ready.
4. Tải lại app. Kiểm tra Có ăn mặc định → Không ăn → Có ăn → Tôi đã ăn,
   rồi tải lại kiểm tra thời gian xác nhận vẫn còn. Dùng dữ liệu thử phù hợp, không xóa lịch sử.

## Phân công việc nhà cho mọi người

Code cho phép tài khoản `member` vào trực tiếp `/khac/quan-tri/viec-nha`;
không yêu cầu quyền admin. Home nay luôn có nút Phân công & sửa việc nhà,
kể cả khi đã có người phụ trách. Nút cũng có ở Lịch và Khác.

- Không thấy nút: kiểm tra Vercel đã deploy commit mới nhất, tải lại app.
- Có nút nhưng lỗi quyền: kiểm tra ba dòng housework của file verify.
  Nếu false, bản quyền 27/09 chưa được áp dụng đúng ở Supabase project đang dùng.
  Áp dụng `20260927000100_family_housework.sql` nếu project chưa có cập nhật này;
  đây là file thay thế hàm, không tạo lại bảng hoặc xóa lịch sử. Sau đó chạy verify lại.
- Báo chỉ sửa tuần tương lai: đây là quy tắc giữ lịch sử, áp dụng cả admin;
  chọn tuần thứ Hai tương lai để đổi thứ tự/phân công. Sửa xác nhận nhầm ở mục riêng.
- Nút Đã làm hôm nay vẫn thuộc người phụ trách tuần đó. Quyền sửa phân công
  không đồng nghĩa ai cũng ghi nhận công việc dưới tên mình trong tuần của người khác.

Không cần chạy setup-family-admins.sql chỉ để sửa việc nhà. File đó dành cho
yêu cầu riêng trước đây: cấp toàn bộ quyền admin (bếp, bữa tối, đồ ăn...) cho cả năm người.

Chưa xác minh trực tiếp bản production hay Supabase của người dùng.
Kiểm tra cục bộ không thay thế smoke test bằng tài khoản member trên iPhone.
