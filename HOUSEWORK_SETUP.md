# Phase 6 — Việc nhà: thiết lập và kiểm tra

Phase 6 nối việc nhà với Supabase. Bếp và bữa tối giữ nguyên logic đã hoàn thành. Đồ ăn nhà gửi vẫn là mock. Chưa bắt đầu Phase 7.

## 1. Chạy đúng một migration mới

Cần migration mới vì schema cũ có bảng nhưng chưa có thao tác lưu nguyên thứ tự 5 người và tạo tuần an toàn cho thành viên. Migration thêm ba hàm nhỏ và hạn chế ghi trực tiếp bảng cấu hình; **không tạo lại bảng, không xóa phân công hay xác nhận cũ**. Check-in tiếp tục dùng RLS, trigger và khóa ngoại Phase 2.

1. Trong VS Code, mở `supabase/migrations/20260915000100_housework_operations.sql`.
2. Copy toàn bộ nội dung file.
3. Mở đúng project gia đình trong Supabase → SQL Editor → New query.
4. Gõ `BEGIN;` ở đầu, dán nội dung file bên dưới, thêm `COMMIT;` ở cuối. Chạy toàn bộ query một lần:

```sql
BEGIN;
-- Dán TOÀN BỘ nội dung file migration Phase 6 vào đây.
COMMIT;
```

Không chạy đoạn mẫu chỉ có comment. BEGIN/COMMIT giúp migration thành một giao dịch: một bước lỗi thì các bước trước không được lưu dang dở. Nếu query bị lỗi, chạy `ROLLBACK;`, giữ lại thông báo lỗi để kiểm tra; đừng chạy lại các migration cũ.

5. Sau khi thành công, mở `supabase/verify-housework.sql`, copy và chạy trong một query mới. Đây là kiểm tra **chỉ đọc**, phù hợp database gia đình. Kết quả có **9 dòng kiểm tra**, tất cả `passed = true`: 4 bảng bật RLS, 3 hàm và 2 hạn chế quyền ghi. Đây không phải 9 bảng.

Không chạy `supabase/tests/housework.sql` trên project gia đình. File đó tạo tài khoản giả trong database kiểm thử trống và được runner cục bộ sử dụng. Không cần thêm tài khoản hay đổi `.env.local` nếu năm hồ sơ/đăng nhập đã hoạt động.

## 2. Chạy app

Mở terminal tại thư mục `outputs/nha-minh`. Dừng server cũ bằng Ctrl+C, chọn Node 24 rồi chạy:

```powershell
$env:PATH = 'C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node --version
npm.cmd run dev
```

Mở http://127.0.0.1:3000/login. Nếu terminal in cổng khác thì mở cổng đó. Giữ terminal chạy. Không thêm dependency trong Phase 6 nên không cần cài lại packages nếu Phase 5 đã chạy.

## 3. Chọn thứ tự năm người

1. Đăng nhập admin → **Khác → Phân công & sửa việc nhà**.
2. Dùng bộ chọn tuần ở đầu trang. Lần đầu có thể chọn tuần hiện tại; nếu đã có vòng luân phiên, chọn một tuần tương lai để sửa thứ tự.
3. Trong **Thứ tự luân phiên**, chọn mỗi người đúng một lần ở năm vị trí. Không có thứ tự gia đình mặc định được điền sẵn.
4. Có thể mở phần xem trước sáu tuần: vị trí 1 → 2 → 3 → 4 → 5 → 1. Đây chỉ là dự kiến, không phải lệnh ghi hàng loạt.
5. Bấm **Lưu thứ tự từ tuần này**. Nếu bắt đầu tuần hiện tại, quay Home sẽ thấy người ở vị trí đầu; tuần sau là người ở vị trí thứ hai.

Nếu đã có phân công tuần hiện tại từ setup trước, phân công đó vẫn được giữ nguyên. Nếu lần đầu chọn tuần bắt đầu ở tương lai thì Home hiện “Tuần này chưa có phân công việc nhà.” cho tới khi tuần đó bắt đầu, hoặc admin thiết lập riêng tuần hiện tại còn trống.

### Tuần đã lưu và thay đổi thứ tự

App tạo tuần hiện tại, tuần kế tiếp và tuần được chọn khi cần đọc dữ liệu. Tạo lại cùng một tuần không ghi đè người phụ trách. Chọn phiên bản thứ tự có ngày hiệu lực gần nhất không sau tuần cần tạo; vị trí được tính bằng số tuần từ ngày bắt đầu, chia dư cho 5.

**Bản thứ tự mới chỉ áp dụng cho tuần chưa tạo.** Mọi tuần đã có phân công được giữ nguyên, kể cả ngoại lệ admin đã chọn. Trang admin giải thích điều này trước khi lưu. Nếu muốn đổi tuần tương lai đã tồn tại, chọn đúng tuần đó rồi dùng **Phân công riêng tuần đang xem → Lưu phân công riêng**. Đổi riêng một tuần không làm dịch chuyển vòng luân phiên của các tuần khác.

Không đổi người phụ trách của tuần hiện tại đã có phân công hoặc tuần quá khứ. Xem lịch sử không tự tạo phân công cũ. Xác nhận cũ gắn với người đã được ghi trong tuần đó bằng khóa ngoại. Admin sửa xác nhận nhầm, không âm thầm chuyển lịch sử cho người khác.

## 4. Thử luồng thực tế

1. Home phải hiện đúng người phụ trách, khoảng thứ Hai–Chủ nhật và hôm nay Chưa xác nhận khi chưa check-in. Không có lịch phải hiện thông báo thiếu phân công, không hiện “không có việc”.
2. Đăng nhập bằng người phụ trách: có **Đã làm hôm nay**. Bấm một lần, chờ lưu: hiện giờ Việt Nam. Tải lại: giữ nguyên giờ. Thử bấm nhanh hai lần không tạo thêm bản ghi.
3. Dùng cửa sổ riêng tư đăng nhập một member khác: thấy người phụ trách và trạng thái thật, không thấy nút xác nhận. Không gửi mật khẩu vào chat. Tải lại để thấy thay đổi từ thiết bị kia; chưa có Realtime.
4. Mở **Lịch**: xem tuần đang chọn và tuần kế tiếp; xem nhiều tuần để kiểm tra người thứ sáu quay về người đầu. Ngày thứ Hai và Chủ nhật cùng tuần có chung một người.
5. Mở **Lịch sử**: chọn tuần có phân công; đủ bảy ngày, ngày có check-in hiện giờ, ngày thiếu là **Chưa xác nhận**, ngày tương lai ghi thêm Chưa tới ngày. Không có điểm/phạt.
6. Admin mở **Phân công & sửa việc nhà → Sửa xác nhận từng ngày**. Chọn ngày đã tới và có phân công. Sửa/bổ sung giờ hoặc tích xác nhận rồi bỏ check-in nhầm. Quay Home/Lịch sử kiểm tra trạng thái. Các thao tác sửa vẫn gắn với người phụ trách đã lưu, không chọn người khác.
7. Thử một thứ tự bị trùng người: không lưu được. Lưu thứ tự mới ở tuần tương lai: các tuần cũ đã tạo và lịch sử giữ nguyên. Thử sửa riêng tuần tương lai; tuần khác giữ nguyên.
8. Member truy cập `/khac/quan-tri/viec-nha` phải trở về Khác. Đăng xuất rồi mở trang riêng tư phải chuyển về login.
9. Tắt mạng và thử xác nhận: hiển thị lỗi, không báo đã lưu. Bật mạng rồi tải lại xem dữ liệu đã lưu thực tế. Màn hình cũ qua nửa đêm sẽ từ chối check-in cho ngày cũ và yêu cầu tải lại.

Sau khi test, admin sửa các xác nhận thử về đúng thực tế. Không cần seed người mẫu hoặc xóa dữ liệu gia đình để chạy tính năng.

## 5. Cách bảo vệ dữ liệu

- Ngày lấy theo `Asia/Ho_Chi_Minh`. Thứ Hai = ngày đang xét trừ số ngày từ thứ Hai; timestamp là `timestamptz`.
- `housework_weeks.week_start` là khóa duy nhất của tuần. `housework_ensure_week` dùng `ON CONFLICT DO NOTHING`, không cần cron hoặc khóa toàn ứng dụng.
- Normal Server Action lấy UUID từ session, kiểm tra người đó là người phụ trách, chỉ cho hôm nay. INSERT không nhận UUID/timestamp của client. Database cấp thời điểm, RLS giới hạn ngày/người, trigger và khóa ngoại kiểm tra đúng phân công; UNIQUE(date) chặn check-in trùng, không ghi đè giờ cũ.
- Các RPC cấu hình kiểm tra admin ở database, cố định search path và giới hạn execute. Thành viên không thể thay thứ tự/phân công qua direct API. Rotation save kiểm tra đủ năm profile/UUID khác nhau và lưu nguyên bộ trong một giao dịch.
- Admin correction dùng quyền admin hiện có. Điều kiện timestamp bảo vệ khi bỏ/sửa xác nhận đã được người khác chỉnh; stale form yêu cầu tải lại. Không có member undo trong Phase 6.
- Sau lưu, Server Actions revalidate Home/Lịch/Lịch sử/trang admin và client refresh. Không báo thành công trước khi database xác nhận. Loading trang dùng fallback hiện có; nút khóa trong khi đang lưu. Realtime và tự refresh khi foreground/reconnect thuộc Phase 8.

## 6. Kiểm tra cục bộ

```powershell
npm.cmd run test:housework
npm.cmd run test:kitchen
npm.cmd run test:dinner
npm.cmd run test:db
npm.cmd run test:auth
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

`test:db` dựng PostgreSQL tạm bằng PGlite, chạy bốn migration rồi các fixtures rollback. Không đọc `.env.local`, không kết nối Supabase thật. Kiểm tra lặp/stale-request là tuần tự; không phải load test hay chứng nhận hai kết nối đồng thời.

Kết quả triển khai cục bộ: lint, typecheck, production build đạt; 10 tests logic việc nhà, 14 tests bếp, 9 tests bữa tối, 10 tests auth/HTTP đạt. Database đạt 149 checks (42 nền tảng + 38 bếp + 28 bữa tối + 41 việc nhà), thêm 9 checks của file verify chỉ đọc. Route admin việc nhà đã được thử HTTP: anonymous chuyển về login, response có no-store. Chưa thử giao diện sau đăng nhập bằng tài khoản thật trong lượt triển khai này.

Kiểm tra bằng tài khoản thật sau khi áp dụng migration và giao diện trên iPhone còn cần thực hiện theo checklist trên. Không coi lint/build đạt là đã kiểm chứng database Supabase triển khai. PWA/deployment vẫn thuộc Phase 9.

## File tạo/cập nhật

Tạo mới:

- `supabase/migrations/20260915000100_housework_operations.sql`, `supabase/verify-housework.sql`, `supabase/tests/housework.sql`.
- `src/lib/housework/rules.ts`, `queries.ts`, `actions.ts`.
- `src/components/housework/controls.tsx`, `views.tsx`, `admin-editor.tsx`.
- `src/app/(family)/khac/quan-tri/viec-nha/page.tsx`.
- `scripts/test-housework.mjs`, `HOUSEWORK_SETUP.md`.

Cập nhật:

- Home/Lịch/Lịch sử page tải thêm dữ liệu việc nhà; các component nhận phần việc nhà thật thay cho mock.
- Khác thêm link admin; app shell ghi đúng phạm vi tính năng đã kết nối.
- Mock provider/data bỏ riêng trạng thái việc nhà. Logic Food không đổi; danh sách thành viên minh họa ở Khác vẫn được ghi nhãn minh họa như trước.
- Database types thêm ba RPC việc nhà, giữ kiểu các bảng cũ.
- `package.json`, `scripts/test-database.mjs`, `supabase/tests/permissions.sql`: thêm tests và kiểm tra FK nền tảng bằng owner sau khi quyền ghi thô được hạn chế.
- `README.md`, `SPEC.md`, `IMPLEMENTATION_PLAN.md`: cập nhật trạng thái và quyết định giữ tuần đã lưu.

Không sửa migration đã áp dụng hoặc logic bếp/bữa tối. Không chạy SQL remote, commit/push, hay bắt đầu Phase 7 tự động.
