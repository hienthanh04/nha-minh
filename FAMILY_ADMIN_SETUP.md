# Cấp quyền quản trị cho cả năm người

Theo yêu cầu ngày 27/09/2026, cả năm hồ sơ hiện có dùng vai trò `admin`.
Không cần đổi chính sách RLS hay tạo lại tài khoản. Các mục Quản trị gia đình,
Sửa bữa tối, Phân công & sửa việc nhà và Lượt gửi đồ ăn dùng quyền admin hiện có.

**Deploy code không tự đổi vai trò trong Supabase.** Nếu hồ sơ vẫn ghi “Thành viên”,
cần thực hiện bước SQL bên dưới trong đúng Supabase project mà Vercel đang dùng.
Migration quyền việc nhà và file verify tháng 10 không cấp đầy đủ quyền admin.

1. Mở `supabase/setup-family-admins.sql`, copy toàn bộ vào Supabase → SQL Editor.
2. Bấm Run. File đã có BEGIN/COMMIT; không chạy lại migration cũ.
3. Kết quả phải có năm dòng, vị trí 1–5, tất cả `role = admin`.
4. Tải lại trang Khác bằng tài khoản trước đây là member. Nếu cần, đăng xuất rồi đăng nhập lại.
   Hồ sơ phải ghi “Quản trị viên” và thấy đủ bốn mục quản trị như tài khoản Em Hỉn.
5. Commit/push code lên nhánh main, chờ deployment Vercel Ready rồi tải lại Home để thấy câu giới thiệu đã được bỏ.

Script chỉ đổi vai trò của hồ sơ đã tồn tại, giữ nguyên UUID, tên, ảnh và dữ liệu
công việc. Có thể chạy lại an toàn. Nếu chưa đủ năm hồ sơ, script dừng không cập nhật.
Đây là cấu hình quyền của gia đình này, không phải migration tự cấp quyền cho tài khoản mới.

Tất cả năm người có đầy đủ quyền quản trị và sửa hồ sơ/lịch/bản ghi như admin hiện tại.
Đăng nhập, RLS và tắt đăng ký công khai vẫn giữ nguyên. Tài khoản Auth không có hồ sơ
không được truy cập. Nút check-in thông thường vẫn theo người được phân công;
việc sửa bản ghi của người khác thực hiện qua màn hình quản trị.
