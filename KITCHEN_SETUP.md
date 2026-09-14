# Phase 4 — Lịch bếp thật

Phạm vi: Home, Lịch, Lịch sử và trình sửa lịch bếp của admin dùng Supabase.
Bữa tối, việc nhà, đồ ăn vẫn là dữ liệu mẫu. Không Realtime, không Phase 5, không cơ chế undo chung.

## 1. Chạy migration mới

Các migration Phase 2 đã chạy thì không chạy lại.
Không có bảng mới, không xóa dữ liệu hiện có, không cần thay .env.local.

1. Mở project của bạn trong Supabase.
2. Vào SQL Editor → New query.
3. Gõ dòng `begin;`, dán **toàn bộ** nội dung file `supabase/migrations/20260913000200_kitchen_operations.sql`, rồi thêm dòng `commit;` ở cuối.
4. Bấm Run một lần. Nếu báo lỗi, dừng lại và gửi lỗi; đừng xóa bảng hoặc chạy lại migration cũ. Nếu transaction bị aborted, chạy `rollback;` trước khi thử lại.
5. Mở query mới, chạy `supabase/verify-kitchen.sql`. Các SELECT trả về nhiều nhóm kết quả; có thể chọn từng SELECT để Run riêng.

Mong đợi: 6 hàm công khai cho authenticated, không cho anon; quyền INSERT/UPDATE/DELETE trực tiếp trên 3 bảng bếp đều false.
Số bảng ứng dụng vẫn là 12. Có đủ 5 profiles và ít nhất 1 admin trước khi lưu lịch.

Migration thêm các thao tác cụ thể vì cấp UPDATE cả bảng cho thành viên sẽ cho phép sửa sai người thực hiện/phân công.
RLS vẫn giới hạn quyền đọc theo gia đình. Các RPC kiểm tra auth.uid() và profile/role bên trong transaction, dùng search_path cố định và thu hồi quyền EXECUTE mặc định.
Admin cũng dùng RPC cho bếp; Supabase SQL Editor chạy với quyền chủ database vẫn dành cho thao tác quản trị thủ công.

## 2. Hoàn tất năm tài khoản/profile

Bạn có thể đăng nhập thử với một profile, nhưng lịch 15 công cần đúng 5 profile để chia 3 công mỗi người.
Theo AUTH_SETUP.md, tạo thêm bốn Auth user rồi gắn UUID thật vào profiles, slot 2–5. Không dùng tên giả trong giao diện mẫu làm dữ liệu sản xuất.
Không cần bốn người còn lại mở app ngay. Signup công khai vẫn tắt.

## 3. Mở ứng dụng

Tại thư mục nha-minh trong terminal VS Code, dùng Node 24. Dừng server cũ bằng Ctrl+C rồi chạy:

```powershell
npm.cmd run dev
```

Mở http://127.0.0.1:3000/login và đăng nhập admin.
Nếu đã mở app trước khi chạy migration, tải lại trang sau khi SQL thành công.

## 4. Tạo lịch bếp đầu tiên

1. Vào **Khác → Quản trị gia đình**.
2. Chọn một ngày trong tuần muốn phân công, bấm **Xem**. Ứng dụng quy về thứ Hai.
3. Trong **Lịch riêng của tuần**, chọn người cho 15 ô: mỗi ngày 2 công nấu và 1 công rửa.
4. Theo dõi số công bên cạnh từng tên; cả năm người phải là 3/3.
5. Bấm **Lưu lịch tuần · 15 công**.
6. Mở **Lịch**, chọn cùng tuần để kiểm tra 15 công đã lưu.
7. Home chỉ hiển thị công đúng ngày hôm nay theo giờ Việt Nam và đúng người đang phụ trách.

Không tự bốc thăm hoặc tự chia người. Lịch chỉ dùng lựa chọn admin đã nhập.
Nếu chọn tuần quá khứ, phải tích ô xác nhận sửa lịch quá khứ. Không thay cả tuần đã có xác nhận hoặc nhờ làm hộ.
Có thể chọn tuần hiện tại để thử xác nhận ngày đã tới; công tương lai chỉ xem/nhờ làm hộ, không xác nhận sớm.

## 5. Lịch mẫu lặp lại

Các bảng template đã có từ Phase 2 được giữ nguyên.
Tại trang quản trị, mở **Lịch mẫu lặp lại từ tuần đã chọn**, chọn đủ 15 công rồi xác nhận lưu.
Lần thiết lập mẫu đầu tiên có thể bắt đầu từ thứ Hai tuần hiện tại. Khi đã có mẫu, thay đổi phải bắt đầu từ một thứ Hai tương lai.

Ứng dụng tạo tuần hiện tại và tuần sau từ mẫu khi người có profile mở trang cần lịch; tuần tương lai được chọn cũng được tạo khi cần.
Nếu không có mẫu, không tự chế ra phân công. Xem tuần quá khứ không tự tạo trách nhiệm lịch sử.

**Chính sách giữ lịch rõ ràng:** thay đổi mẫu giữ nguyên TẤT CẢ các tuần đã tạo, bao gồm chỉnh sửa riêng.
Chỉ tuần chưa tạo lấy mẫu có hiệu lực gần nhất. Đổi tuần đã tạo thì dùng trình sửa lịch tuần.
Không có thao tác lan truyền ghi đè hàng loạt; cách này bảo vệ dữ liệu đã xác nhận/nhờ làm hộ.
Vì mở Lịch có thể tạo tuần tương lai từ mẫu, nếu một tuần đã được xem trước, nó cũng thuộc các tuần được giữ nguyên.

## 6. Xác nhận và nhờ làm hộ

- Home đọc toàn bộ tuần (15 công), rồi chọn công có date bằng ngày Việt Nam hôm nay và coalesce(delegated_to, assigned_to) bằng ID người đăng nhập. Đọc cả tuần giúp phân biệt chưa có lịch với không có công cá nhân.
- **Đã làm** gọi kitchen_complete. Database tự lấy auth.uid(), kiểm tra người phụ trách, trạng thái chưa xác nhận và ngày không ở tương lai. completed_at lấy đồng hồ database.
- Trong lúc lưu, nút bị khóa; chỉ hiện hoàn thành khi database đã lưu. Gửi lại yêu cầu bị từ chối, không đổi thời gian hay cộng công lần hai.
- **Chi tiết công → Nhờ người khác làm hộ → chọn người → Xác nhận lựa chọn**. Chỉ người được phân công gốc được chọn, đổi hoặc hủy trước khi hoàn thành.
- Người nhận không nhờ tiếp được. assigned_to giữ nguyên, delegated_to ghi riêng, trách nhiệm chuyển cho người nhận.
- Khi có cập nhật từ thiết bị khác, tải lại trang để xem trạng thái mới. Chưa có Realtime.
- Nếu báo lỗi hoặc mất mạng, tải lại để kiểm tra trạng thái thật trước khi thử lại. Không lưu offline.

## 7. Tổng công và xác nhận muộn

Lịch sử lọc công theo date thuộc tuần đã chọn. Với mỗi member:
count(status = completed và completed_by = member).
Không đếm assigned_to và không lưu bảng tổng/counter.

2/3 → Thiếu 1; 3/3 → Đủ; 4/3 → Dư 1. Tuần hiện tại có nhãn Tạm tính.
Nhấn tên để xem công được phân công gốc, nhờ người khác, nhận làm thay và công thực sự đã làm.
Chi tiết hiển thị người làm thật và thời điểm xác nhận theo giờ Việt Nam.

Công quá khứ vẫn là Chưa xác nhận. Người đang phụ trách có thể xác nhận từ Lịch hoặc chi tiết Lịch sử.
Thời điểm bấm được giữ ở completed_at, nhưng công vẫn tính theo ngày công thuộc tuần gốc.

## 8. Sửa bản ghi nhầm

Admin mở công ở Lịch/Lịch sử → Chi tiết công → **Quản trị viên: sửa xác nhận**.
Chọn người thực sự làm cùng thời điểm (giờ Việt Nam), hoặc chọn Chưa xác nhận để bỏ xác nhận nhầm.
Tích ô xác nhận chỉnh sửa rồi lưu. Không đổi phân công gốc hoặc nhờ làm hộ bằng thao tác này.
Nếu bản ghi đã đổi sau khi mở form, thao tác bị từ chối để tránh ghi đè.
Nếu nhờ nhầm, người được phân công gốc hủy/đổi nhờ làm hộ trước khi hoàn thành; nếu đã hoàn thành nhầm thì admin sửa xác nhận trước.

## 9. Thử bằng hai tài khoản A và B

A/B là cách gọi trong bài thử; dùng tài khoản gia đình thật, không tạo thêm người thứ sáu.
Cần đủ năm profile để lưu lịch, nhưng chỉ cần hai tài khoản đăng nhập để thử luồng này.
Dùng hai trình duyệt hoặc một cửa sổ thường và một cửa sổ riêng tư để không dùng chung cookie.

1. Admin tạo lịch tuần hiện tại, đảm bảo A có một công của hôm nay (hoặc một ngày đã qua để thử từ Lịch).
2. Đăng nhập A: thấy công đúng người, ngày, loại.
3. Mở B: công A chưa nhờ không có nút Đã làm dành cho B.
4. A mở chi tiết công, nhờ B và xác nhận.
5. A tải lại: công biến khỏi danh sách cá nhân Home; vẫn thấy phân công gốc và B làm thay trong Lịch.
6. B tải lại: nếu đúng hôm nay, Home có công kèm Làm thay cho A; nếu là ngày quá khứ, mở từ Lịch.
7. B không có mục nhờ tiếp. B bấm Đã làm.
8. Tải lại cả hai: đúng một công hoàn thành, thời điểm không đổi. Lịch sử tính +1 cho B, không cộng cho A.
9. Bấm tên A và B trong Lịch sử: cả hai đều truy được cùng bản ghi và hiểu ai được giao/ai làm thật.
10. Thử một công khác không nhờ: A bấm Đã làm, A được +1.
11. Thử công chưa xác nhận của tuần trước: xác nhận xong chỉ thay đổi tổng tuần trước. Nếu chưa có lịch cũ, admin có thể tạo lịch tuần trước với ô xác nhận chỉnh sửa; chỉ làm khi đó là lịch thực tế gia đình muốn ghi nhận.
12. Admin thử lưu cả tuần đã có hoạt động: bị chặn. Admin sửa một xác nhận nhầm trong chi tiết: được; tài khoản member không thấy công cụ sửa và không có quyền RPC.
13. Trên điện thoại: kiểm tra không tràn ngang, nút dễ bấm, các tab giữ nguyên và trạng thái lỗi rõ khi ngắt mạng.

Sau thử, dùng công cụ sửa xác nhận của admin để chỉnh các lần thử nhầm; không xóa toàn bộ lịch/database.

## 10. Kiểm tra cục bộ và giới hạn

```powershell
npm.cmd run test:kitchen
npm.cmd run test:db
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

- test:kitchen: 14 kiểm tra quy tắc phân công, trách nhiệm, trace, 2/3–4/3, công muộn và ranh giới ngày/tuần Việt Nam.
- test:db: chạy cả ba migration trên PostgreSQL PGlite cục bộ; 42 kiểm tra nền tảng và 38 kiểm tra bếp. Mọi fixture rollback. Không đọc .env.local hoặc liên hệ Supabase.
- test:auth với TEST_BASE_URL: 10 kiểm tra bao gồm cả năm route bảo vệ.
- Kiểm tra lặp yêu cầu và tranh chấp trạng thái cũ; chưa kiểm thử hai kết nối PostgreSQL thực sự chạy đồng thời.
- Bản cục bộ build/lint/typecheck đạt. Chưa áp dụng migration lên project của bạn và chưa chứng nhận luồng hai tài khoản thật/iPhone. Hoàn tất bước 1–9 trước Phase 5.
- Không chạy supabase/tests/kitchen.sql trên database đã có profile thật; file có chốt bảo vệ database thử rỗng. Dùng npm.cmd run test:db để kiểm tra an toàn.
- Không tự commit/push.

## 11. File thay đổi

- supabase/migrations/20260913000200_kitchen_operations.sql: RPC, quyền ghi và timestamp chống sửa form cũ.
- supabase/verify-kitchen.sql, supabase/tests/kitchen.sql: kiểm tra cấu hình và quyền bếp.
- supabase/tests/permissions.sql: fixture kiểm tra constraint chạy bằng owner; quyền API kiểm tra riêng trong bài Phase 4.
- src/lib/kitchen/rules.ts: ngày Việt Nam, 15 ô, số công và trace.
- src/lib/kitchen/queries.ts: đọc lịch và tạo tuần theo mẫu.
- src/lib/kitchen/actions.ts: Server Actions có xác thực.
- src/lib/supabase/database.types.ts: kiểu RPC và metadata cần cho typed queries (vẫn là khai báo thủ công, không có typed relation joins).
- src/components/kitchen/duty-card.tsx, week-view.tsx, schedule-editor.tsx: thẻ công, lịch/tổng công và editor mobile.
- src/app/(family)/page.tsx, lich/page.tsx, lich-su/page.tsx, khac/quan-tri/page.tsx: tích hợp dữ liệu bếp thật.
- src/app/(family)/loading.tsx: trạng thái đang tải.
- src/components/home-screen.tsx, schedule-screen.tsx, history-screen.tsx: thay riêng phần bếp.
- src/components/prototype-provider.tsx, src/lib/mock-data.ts: bỏ logic bếp mẫu; giữ các tính năng mẫu khác.
- src/components/duty-card.tsx: bỏ thẻ bếp mẫu cũ.
- src/components/app-shell.tsx, src/app/(family)/khac/page.tsx: nhãn phân biệt bếp thật và dữ liệu mẫu.
- scripts/test-kitchen.mjs, scripts/test-database.mjs, package.json: lệnh kiểm tra.
- README.md, SPEC.md, IMPLEMENTATION_PLAN.md, KITCHEN_SETUP.md: trạng thái và hướng dẫn.

Không đổi schema hoặc tích hợp Dinner, Housework, Food. Không cần quyết định nghiệp vụ mới trước Phase 5; cần chạy migration, có đủ 5 profile và hoàn tất kiểm tra hai tài khoản.

