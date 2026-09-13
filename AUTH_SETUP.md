# Phase 3 — Đăng nhập và tài khoản gia đình

Phạm vi: email/mật khẩu, cookie phiên, profile thật và quyền member/admin. Các thẻ công việc vẫn dùng dữ liệu mẫu của Phase 1. Không có migration mới, không chạy lại migration Phase 2.

## 1. Tắt đăng ký công khai

Trong project Supabase, vào **Authentication → Sign In / Providers** (một số giao diện gọi là Providers hoặc Settings).
Tìm **Allow new users to sign up**, tắt và lưu. Giữ đăng nhập Email được bật; không bật anonymous sign-ins hoặc social providers.
Việc không có nút đăng ký trong app không thay thế bước cấu hình này.

Nguồn: [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration).

## 2. Tạo thủ công đúng năm người dùng

1. Vào **Authentication → Users** trong project.
2. Chọn **Add user → Create new user** (hoặc Create user).
3. Nhập email và mật khẩu thật của thành viên. Không dùng Send invitation.
4. Chọn **Auto Confirm User** khi tạo tài khoản do quản trị viên cấp để người đó đăng nhập ngay.
5. Tạo user, mở thông tin user và copy **User UID/UUID**.
6. Lặp lại cho năm thành viên. Không ghi mật khẩu vào Git hoặc gửi vào chat.
7. Tạo các profile tương ứng theo bước 3. Tên trong Auth metadata không thay thế public.profiles.

Nguồn: [Supabase Users](https://supabase.com/docs/guides/auth/users).
Nếu quên mật khẩu, quản trị viên hỗ trợ qua Dashboard; app không có luồng khôi phục mật khẩu.

## 3. Gắn UUID vào profile

Trong SQL Editor, thay TOÀN BỘ placeholder trước khi chạy. Các giá trị bên dưới cố ý không phải UUID hợp lệ để tránh chạy nhầm.
Chọn người quản trị phù hợp; ví dụ dùng slot 1 làm admin, bốn slot còn lại là member.
Không tự tạo UUID mới: phải dùng UUID đã copy từ Auth.

```sql
begin;
insert into public.profiles (id, display_name, role, member_slot)
values
  ('<AUTH_UUID_1>'::uuid, '<TEN_HIEN_THI_1>', 'admin', 1),
  ('<AUTH_UUID_2>'::uuid, '<TEN_HIEN_THI_2>', 'member', 2),
  ('<AUTH_UUID_3>'::uuid, '<TEN_HIEN_THI_3>', 'member', 3),
  ('<AUTH_UUID_4>'::uuid, '<TEN_HIEN_THI_4>', 'member', 4),
  ('<AUTH_UUID_5>'::uuid, '<TEN_HIEN_THI_5>', 'member', 5)
on conflict (id) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  member_slot = excluded.member_slot;
commit;
```

Nếu có profile trước đó, giữ nguyên cách gán slot để không đụng unique constraint. Không xóa lịch sử hoặc hạ quyền admin cuối cùng để xử lý lỗi. Nếu tên có dấu nháy đơn, viết hai dấu nháy: O''Name.

Kiểm tra:

```sql
select id, display_name, role, member_slot
from public.profiles order by member_slot;

select count(*) = 5 as has_five_members,
       count(*) filter (where role = 'admin') >= 1 as has_admin
from public.profiles;
```

Cần đủ năm dòng, slot 1–5, hai cột kiểm tra đều true.
Để thử tài khoản không có profile mà không tạo người thứ sáu: sau khi tạo Auth user thứ năm, thử đăng nhập TRƯỚC khi thêm profile của người đó. Phải thấy thông báo không có quyền truy cập. Sau đó hoàn tất profile thứ năm.

## 4. Chạy ứng dụng

Trong terminal VS Code tại thư mục nha-minh, dùng Node 24 (node --version). Dùng npm.cmd nếu PowerShell chặn npm.ps1.

```powershell
npm.cmd install
npm.cmd run dev
```

Mở http://127.0.0.1:3000/login. Giữ terminal chạy. Nếu cổng 3000 đang dùng, dừng server cũ bằng Ctrl+C hoặc dùng cổng được terminal thông báo.
Sau khi sửa .env.local, khởi động lại server.

Biến môi trường vẫn là:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<PUBLISHABLE_OR_ANON_KEY>
```

Tên biến ANON_KEY chấp nhận publishable key sb_publishable_...; ứng dụng cũng hỗ trợ tên NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY nếu bạn đã dùng tên này (ưu tiên tên này khi cả hai có giá trị). Không dùng secret/service-role key.
Không cần thêm biến nếu cấu hình hiện tại đã có URL và một trong hai tên key trên. .env.local được Git bỏ qua.
Dùng cùng hostname khi thử giữ phiên: localhost và 127.0.0.1 có cookie riêng.

## 5. Checklist thử với tài khoản thật

- [ ] Cửa sổ riêng tư: mở /, /lich, /lich-su, /khac, /khac/quan-tri đều về /login.
- [ ] Nhập sai mật khẩu: có lỗi tiếng Việt, không vào Home.
- [ ] Tài khoản A đăng nhập: Home và Khác hiển thị tên/profile A.
- [ ] Lặp lại cho cả năm tài khoản; mỗi người đúng tên, slot, vai trò.
- [ ] Tải lại trang, đóng/mở trình duyệt thường: vẫn đăng nhập khi cookie và phiên còn hợp lệ. Cửa sổ riêng tư có thể xóa phiên khi đóng.
- [ ] Khi đã đăng nhập, mở /login: tự về Home.
- [ ] Auth user chưa có profile: chỉ thấy lỗi quyền truy cập và nút Đăng xuất, không có dữ liệu gia đình.
- [ ] Member gõ trực tiếp /khac/quan-tri: bị chuyển về /khac.
- [ ] Admin thấy liên kết quản trị ở Khác và mở được trang quản trị mẫu.
- [ ] Đăng xuất: về /login; tải lại mọi trang được bảo vệ phải về /login.
- [ ] Thử 390px trên DevTools: login không tràn ngang, Enter gửi form, nút có trạng thái chờ. Sau login thử bottom navigation và thao tác mẫu của Phase 1.
- [ ] Thử giữ phiên trên iPhone thật khi có môi trường HTTPS; kiểm tra PWA hoàn chỉnh ở Phase 9.

## 6. Kiểm tra dành cho người phát triển

```powershell
npm.cmd run test:auth
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

test:auth kiểm tra validator/profile và quyền admin. Hai bài HTTP mặc định bỏ qua nếu không có server chạy.
Để chạy cả HTTP checks với phiên ẩn danh, mở terminal thứ hai:

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3000'
npm.cmd run test:auth
```

HTTP checks không gửi tài khoản hay đọc .env.local, chỉ kiểm tra chuyển hướng và form công khai.
Chúng không thay thế checklist tài khoản thật, cookie refresh và đăng xuất bên trên.

## Thiết kế và giới hạn

Kết quả kiểm tra ngày 13/09/2026: lint, typecheck, production build đạt trên Node 24; test:auth đạt 10/10 khi trỏ tới server production cục bộ. Browser kiểm tra login 390px không tràn ngang, trạng thái chờ khóa nút và lỗi tiếng Việt khi gửi thông tin thử sai tới Supabase. Chưa thử đăng nhập thành công bằng tài khoản gia đình, cookie refresh thực tế, đăng xuất phiên thật hay Home sau đăng nhập.

- src/proxy.ts làm mới cookie bằng Supabase SSR và giữ header private/no-store.
- Mỗi page được bảo vệ gọi requireProfile, trang quản trị gọi requireAdmin. Không chỉ kiểm tra layout hay giấu liên kết.
- Server gọi getUser để xác minh với Auth, rồi đọc đúng profile bằng client có phiên của người dùng. Không tin role từ form, metadata hoặc localStorage.
- React cache chỉ gộp đọc trong cùng lần render, không chia sẻ profile giữa người dùng.
- Logout dùng scope local: kết thúc phiên trình duyệt đang dùng, không đăng xuất thiết bị khác.
- Lỗi đọc profile/kết nối bị chặn truy cập và có hướng dẫn thử lại.
- Không có query tới các bảng công việc. Identity thật và các thẻ minh họa được ghi nhãn rõ.
- Chưa tự tạo user, chỉnh cấu hình Dashboard, commit hoặc push.
- Chưa chứng nhận năm tài khoản thật, refresh-token thực tế hay iPhone: người quản trị hoàn tất checklist trên trước Phase 4.

Tham khảo: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Supabase session verification](https://supabase.com/docs/guides/auth/server-side/advanced-guide).
