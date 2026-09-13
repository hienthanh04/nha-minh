# Hoàn tất Phase 2 — từng bước

UI vẫn dùng mock data. Hướng dẫn này không bắt đầu Phase 3.

## 1. Lưu cấu hình

File `.env.local` nằm cạnh `package.json`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=DAN_PUBLISHABLE_KEY_VAO_DAY
```

Giữ tên biến `_ANON_KEY` vì code hiện đọc tên đó, dù giá trị là publishable key mới. Không dùng URL dashboard hoặc secret/service-role key. Không đưa `.env.local` vào Git. Nhấn Ctrl+S sau khi sửa.

## 2. Chạy migration trong project Supabase

Mở project `nha-minh` → **SQL Editor** → query mới. Chạy theo thứ tự, mỗi file một query:

1. [20260912000100_initial_schema.sql](supabase/migrations/20260912000100_initial_schema.sql)
2. [20260913000100_fix_member_permissions.sql](supabase/migrations/20260913000100_fix_member_permissions.sql)

Trong VS Code, mở file → Ctrl+A → Ctrl+C. Trong SQL Editor, nhập `BEGIN;` ở đầu, dán toàn bộ file, thêm `COMMIT;` ở cuối rồi bấm **Run**. Việc bọc transaction giúp thay đổi cùng thành công hoặc cùng bị hủy.

Nếu đã chạy file đầu thành công, chỉ chạy file thứ hai. Không chạy lại file đầu; không xóa bảng để thử lại. Nếu gặp `already exists` hoặc lỗi khác, dừng và gửi thông báo lỗi để kiểm tra. File thứ hai từ chối các tuần bếp chưa đủ hoặc dữ liệu check-in cũ không nhất quán thay vì tự xóa dữ liệu.

## 3. Kiểm tra bảng và quyền

Chạy [supabase/verify.sql](supabase/verify.sql) trong query mới. Phần bảng phải có đúng **12 dòng**, tất cả `rls_enabled = true`. Query policy liệt kê các quyền đọc, quyền admin và quyền insert riêng cho check-in hôm nay.

Sau đó kiểm tra hành vi RLS, không chỉ nhìn cấu hình:

1. Chỉ làm bước này khi chưa nhập profile/dữ liệu gia đình thật.
2. Mở [supabase/tests/permissions.sql](supabase/tests/permissions.sql).
3. Dán và chạy **toàn bộ file**, bao gồm `BEGIN` ở đầu và `ROLLBACK` ở cuối. Giữ role quản trị mặc định của SQL Editor.
4. Tất cả kết quả phải là `PASS`, không có lỗi. Các thao tác bị cấm được bài test cố ý thử và bắt lỗi; nếu chúng vô tình được phép, bài test sẽ báo FAIL.

File tạo năm profile giả và một Auth ID không có profile. Không có email/password hoặc tài khoản đăng nhập thật. Tất cả dữ liệu thử được **rollback**, không lưu lại. Bài test có guard dừng ngay nếu `profiles` không rỗng. Nếu đã có dữ liệu, dùng project thử riêng; không xóa dữ liệu để chạy test.

Nếu bài test báo lỗi, không thay `ROLLBACK` bằng `COMMIT`. Chạy `ROLLBACK;` trước query tiếp theo nếu transaction đang bị lỗi. SQL Editor có thể hiện kết quả SELECT trước ROLLBACK hoặc chỉ thông báo hoàn thành; mọi assertion sai đều phải phát sinh lỗi. Có thể xem kết quả đầy đủ qua `npm.cmd run test:db`.

Các kiểm tra dùng role PostgreSQL `anon` và `authenticated`, cộng claim UUID giả để thực thi RLS thật. Chưa kiểm tra đăng nhập/phát hành JWT, vì đó là Phase 3. Table Editor mặc định có quyền cao, nên thấy dữ liệu ở đó không chứng minh rằng member được phép đọc.

## 4. Kiểm tra ở máy mình

Trong terminal tại thư mục `nha-minh`:

```powershell
npm.cmd run test:db
npm.cmd run lint
npm.cmd run typecheck
```

`test:db` dùng PostgreSQL trong bộ nhớ (PGlite), chạy nguyên văn hai migration với pgcrypto và cùng file SQL test. Nó không đọc `.env.local`, không gọi Supabase và không lưu dữ liệu. Test local không thay cho bước kiểm tra project Supabase ở trên.

## 5. Commit/push sau khi Supabase kiểm tra thành công

Dùng Git Bash hoặc terminal VS Code, tại thư mục `nha-minh`:

```bash
git status
git check-ignore .env.local
git add README.md DATABASE_SETUP.md PHASE2_CHECKLIST.md .env.example package.json package-lock.json src/lib/supabase scripts/test-database.mjs supabase
git diff --cached --stat
git commit -m "feat: complete Phase 2 database foundation and RLS tests"
git push origin main
```

`git check-ignore .env.local` phải in `.env.local`. Danh sách staged không có `.env.local`, `node_modules` hoặc `.next`. Nếu chưa có upstream, dùng `git push -u origin main`. Hướng dẫn này không tự commit hoặc push thay bạn.

## Phạm vi bản sửa

- Admin sửa dinner plans/check-ins và housework check-ins của người khác.
- Member chỉ check-in hôm nay theo `Asia/Ho_Chi_Minh`; timestamp dùng mặc định `now()`. Chưa có quyền tự sửa/xóa check-in (undo để sau).
- Dinner check-in cần plan `eating`; không thể đổi plan trong khi vẫn có check-in.
- Housework check-in phải khớp assignment của tuần; FK bảo vệ lịch sử. Admin muốn sửa assignment nhầm cần xử lý check-in liên quan trong cùng transaction.
- Tuần bếp/template phải đủ 15 công, ba phân công ban đầu mỗi người. Deferred constraints kiểm tra khi transaction kết thúc; chưa có chức năng tự sinh lịch hay UI lưu lịch.
- Không đổi UI, không thêm đăng nhập, không triển khai Phase 3. Tạo năm tài khoản/email thật và kiểm tra Auth được làm sau; public signup phải tắt trước khi dùng app thật.

Nguồn: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Supabase testing](https://supabase.com/docs/guides/local-development/testing/overview).
