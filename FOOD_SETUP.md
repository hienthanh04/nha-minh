# Phase 7 — Lượt gửi đồ ăn

Đồ ăn đã chuyển sang dữ liệu Supabase. Bếp, bữa tối và việc nhà giữ nguyên logic. Không còn dữ liệu mẫu trong các tính năng chính; danh sách thành viên ở Khác cũng đọc tên thật. Chưa bắt đầu Phase 8, Realtime, PWA hay deployment.

## 1. Chạy migration mới

Cần migration `supabase/migrations/20260919000100_food_operations.sql` để:

- Cấp thao tác nhận/hết cho thành viên qua RPC có kiểm tra quyền; khóa quyền ghi thô vào hai bảng đồ ăn.
- Kết thúc đợt và tạo đúng một lượt chờ kế tiếp trong cùng giao dịch.
- Lưu danh sách/thứ tự nguyên bộ, luôn giữ ít nhất một nhà đang tham gia. Unique thứ tự được kiểm tra sau khi đổi vị trí trong giao dịch để có thể hoán đổi hai nhà.
- Thêm kiểm tra đợt đã hết có ngày nhận hợp lệ và timestamp cho việc phát hiện form cũ.
- Cho admin sửa ngày/ghi chú và sửa nhầm trạng thái trong phạm vi an toàn.

Không tạo lại bảng, không đổi migration đã áp dụng, không xóa lịch sử trong lúc migrate.

Các bước trong Supabase:

1. Mở đúng project gia đình → **SQL Editor → New query**.
2. Trong VS Code mở file migration Phase 7 ở trên, copy toàn bộ.
3. Trong SQL Editor gõ **`BEGIN;`** ở dòng đầu, dán toàn bộ nội dung file, rồi gõ **`COMMIT;`** ở dòng cuối. Cả hai dòng đều có dấu `;`. Không sửa các `begin` bên trong hàm.
4. Chạy toàn bộ query một lần. Không chạy lại migration Phases 2/4/6.
5. Nếu báo lỗi, chạy riêng `ROLLBACK;` rồi kiểm tra lỗi. Nếu lỗi liên quan `food_finished_dates_valid`, dữ liệu cũ có đợt finished thiếu ngày nhận/ngày không hợp lệ: giữ lại dữ liệu, xác định ngày đúng trước khi sửa. Không xóa lịch sử hoặc điền ngày đoán.
6. Sau khi thành công, copy `supabase/verify-food.sql` và chạy trong query mới. Đây là **chỉ đọc**: cần **10 dòng kiểm tra đều `passed = true`**, không phải 10 bảng.

Không chạy `supabase/tests/food.sql` trên project gia đình. File đó chỉ dành cho database test trống, có tạo tài khoản/nhà giả. Dùng `npm.cmd run test:db` để chạy an toàn trên PostgreSQL tạm trong máy.

## 2. Chạy ứng dụng

Mở terminal tại thư mục `outputs/nha-minh`. Dừng server cũ bằng Ctrl+C, chọn Node 24 rồi chạy:

```powershell
$env:PATH = 'C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node --version
npm.cmd run dev
```

Mở http://127.0.0.1:3000/login. Nếu terminal in cổng khác, mở cổng đó. Không cần sửa `.env.local` hoặc thêm tài khoản nếu các phase trước đã hoạt động. Không thêm dependency trong Phase 7 nên không cần cài packages lại.

## 3. Thiết lập tên nhà và lượt đầu

1. Đăng nhập admin → **Khác → Lượt gửi đồ ăn**.
2. Bấm **Thêm nhà gửi đồ**, nhập tên thật và thứ tự 1, 2, 3… theo thỏa thuận của gia đình. Không có tên nhà mặc định. Đây là nhà bên ngoài gửi thức ăn, không phải tài khoản của năm thành viên app.
3. Giữ **Đang tham gia gửi đồ** cho các nhà có tham gia. Mỗi thứ tự phải khác nhau, kể cả nhà tạm tắt lượt; cần ít nhất một nhà bật.
4. Bấm **Lưu danh sách và thứ tự**. Có thể thay đổi nhiều số rồi lưu một lần để hoán đổi vị trí.
5. Tại **Bắt đầu lượt đầu tiên**, chọn nhà mà gia đình muốn bắt đầu và bấm **Khởi tạo lượt chờ**. Chưa có ngày nhận ở bước này.
6. Về Home: thấy **Đang chờ đồ từ…** và nút **Đã gửi đồ**.

Lượt đầu chỉ khởi tạo một lần. Nếu đã có lịch sử nhưng không có đợt hiện tại, hãy kiểm tra dữ liệu trước, không tự khởi tạo thêm một chuỗi khác.

## 4. Dùng và kiểm tra bằng tài khoản thật

1. Khi thực tế đã nhận đồ, bất kỳ thành viên nào bấm **Đã gửi đồ**: chuyển sang Đang dùng, ngày nhận là hôm nay ở Việt Nam. Tải lại kiểm tra vẫn lưu.
2. Khi dùng hết, bấm **Đồ ăn đã hết**. Thử **Hủy**: trạng thái không đổi. Bấm lại và **Xác nhận**: đợt hiện tại vào lịch sử, nhà kế tiếp thành Đang chờ, chưa có ngày nhận.
3. Dùng cửa sổ riêng tư đăng nhập member khác, tự nhập mật khẩu. Member cũng được nhận/hết, nhưng không có quyền đổi tên/thứ tự hay sửa lịch sử. Đường dẫn `/khac/quan-tri/do-an` phải trở về Khác với member, về login với người chưa đăng nhập.
4. Mở **Lịch sử → Những đợt đồ ăn**: thấy các nhà thật, trạng thái, ngày nhận, ngày/giờ hết, ghi chú nếu có. Mới nhất trước; nút Đợt cũ hơn/mới hơn phân trang 20 đợt. Phần này không lọc theo tuần của bếp/việc nhà.
5. Admin thử đổi tên/thứ tự hoặc tắt lượt một nhà. Đợt hiện tại giữ nguyên nhà, lịch sử không bị xóa. Lần kết thúc tiếp theo dùng thứ tự mới và bỏ qua nhà tắt lượt. Hết danh sách quay lại đầu; nếu chỉ một nhà bật thì quay lại chính nhà đó.
6. Thử bấm nhanh hai lần hoặc mở cùng trạng thái ở hai cửa sổ: chỉ có một đợt kế tiếp. Cửa sổ cũ báo cần tải lại; không tự hoàn thành đợt mới thay cho đợt đã bấm.
7. Tắt mạng khi bấm: phải báo chưa lưu được, không giả vờ thành công. Bật mạng rồi tải lại để xem trạng thái đã lưu thực tế. Thay đổi trên thiết bị khác hiện sau khi tải lại; chưa có Realtime.

Chỉ đánh dấu nhận/hết đúng thực tế. Nếu thử nhầm, dùng cách sửa admin bên dưới; không xóa database gia đình để test. Kiểm tra tình huống nhiều vòng/đổi thứ tự tùy ý đã có trong tests cục bộ.

## 5. Ghi chú và sửa nhầm

Admin mở **Khác → Lượt gửi đồ ăn → Ghi chú và sửa bản ghi nhầm**, mở đợt cần sửa:

- Ghi chú là tùy chọn (tối đa 500 ký tự). Ngày nhận/giờ hết có thể sửa nếu hợp lệ; giờ nhập theo Việt Nam. Tích xác nhận rồi lưu. Chỉ sửa ghi chú không làm tròn timestamp đã lưu.
- **Nhận nhầm:** đợt đang active có nút **Sửa về đang chờ**, xóa ngày nhận sau khi admin xác nhận.
- **Bấm hết nhầm:** chỉ mở lại khi lượt kế tiếp vẫn là waiting chưa nhận và chưa bị thay đổi. **Mở lại đợt chưa hết** đưa đợt cũ về active, bỏ lượt chờ kế tiếp chưa nhận trong cùng giao dịch.
- Nếu lượt kế tiếp đã active/finished, không quay lui. Giữ chuỗi lịch sử, chỉ sửa ngày/ghi chú để giải thích bản ghi nhầm.

Không xóa nhà đã lưu: tắt lượt thay vì xóa. Không đổi nhà gắn với một đợt qua công cụ sửa. Không có nút Undo thông thường; mọi sửa trạng thái là admin xác nhận rõ ràng và kiểm tra dữ liệu mới nhất.

## 6. Cách dữ liệu hoạt động

- Current = đợt duy nhất `waiting` hoặc `active`. Unique index đã có từ Phase 2 bảo đảm không có hai đợt chưa kết thúc.
- Next = nhà đang bật có `rotation_position` nhỏ nhất lớn hơn vị trí hiện tại; nếu không có thì lấy nhà đang bật đầu tiên. Nhà hiện tại dù vừa bị tắt vẫn giữ gắn kết với đợt cũ.
- Nhận: UPDATE chỉ khi đúng ID, timestamp và `waiting`; ngày nhận do database tính theo `Asia/Ho_Chi_Minh`.
- Hết: UPDATE chỉ khi đúng ID, timestamp và `active`; lưu `finished_at = now()`, rồi INSERT successor waiting. Nếu không có nhà tiếp theo hoặc INSERT lỗi, cả giao dịch rollback. Unique predecessor ngăn hai successor cho cùng một đợt.
- Các RPC lấy quyền từ `auth.uid()` qua family/admin checks, fixed search path, hạn chế execute. RLS vẫn giới hạn đọc; các thành viên không thể ghi trực tiếp arbitrary status hoặc cấu hình. Runtime không có service-role key.
- Sau thao tác, server revalidate Home/Lịch sử/admin và client refresh, không cần reload toàn trang. Nút khóa khi đang lưu; loading dùng fallback hiện có; lỗi hiển thị tiếng Việt, không đưa raw SQL ra UI.
- Thứ tự thay đổi không làm vòng quay chạy theo ngày. Không có cron, thông báo, tồn kho hoặc tính hạn sử dụng.

## 7. Kiểm tra tự động

```powershell
npm.cmd run test:food
npm.cmd run test:housework
npm.cmd run test:dinner
npm.cmd run test:kitchen
npm.cmd run test:db
npm.cmd run test:auth
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Database tests chạy cả năm migration trong PGlite cục bộ rồi rollback fixtures. Không đọc `.env.local` hoặc kết nối Supabase thật. Các kiểm tra thao tác lặp/stale là tuần tự, không phải chứng nhận hai kết nối đồng thời. Constraints và conditional updates bảo vệ giao dịch bình thường; smoke test bằng tài khoản thật sau migration vẫn cần thực hiện.

Kết quả cục bộ: 12 tests đồ ăn, 14 tests bếp, 9 tests bữa tối, 10 tests việc nhà và 10 tests auth/HTTP đạt. Database đạt 188 checks (42 nền tảng + 38 bếp + 28 bữa tối + 41 việc nhà + 39 đồ ăn), cùng 10 checks verify đồ ăn và 9 checks verify việc nhà. Lint, typecheck và production build đạt. HTTP trang admin đồ ăn đã được kiểm tra: anonymous chuyển về login, response có no-store. Chưa kiểm tra giao diện sau đăng nhập bằng tài khoản thật hoặc thiết bị iPhone trong lượt triển khai này.

## 8. File tạo/cập nhật và giới hạn

Tạo mới:

- `supabase/migrations/20260919000100_food_operations.sql`, `supabase/verify-food.sql`, `supabase/tests/food.sql`.
- `src/lib/food/rules.ts`, `queries.ts`, `actions.ts`.
- `src/components/food/controls.tsx`, `views.tsx`, `admin-editor.tsx`.
- `src/app/(family)/khac/quan-tri/do-an/page.tsx`.
- `src/lib/date-format.ts` (chuyển nguyên logic hiển thị ngày/giờ khỏi file mock), `scripts/test-food.mjs`, `FOOD_SETUP.md`.

Cập nhật:

- Home/Lịch sử tải dữ liệu đồ ăn, thay phần mock bằng card thật; layout bỏ mock provider.
- Khác thêm admin link và đọc danh sách profile thật; app shell bỏ nhãn đồ ăn mẫu.
- `ui.tsx` đổi đường dẫn import formatter, không đổi cách hiển thị giờ của các tính năng cũ.
- Database types thêm năm RPC; `package.json`, runner DB và fixture quyền nền tảng cập nhật theo quyền ghi mới.
- README/SPEC/IMPLEMENTATION_PLAN cập nhật phạm vi Phase 7.

Xóa `src/components/prototype-provider.tsx` và `src/lib/mock-data.ts` vì không còn tính năng dùng fixtures.

Không sửa logic của bếp, bữa tối, việc nhà hoặc các migration đã áp dụng. Trước Phase 8 còn cần áp dụng migration trên project thật, kiểm tra cấu hình và các luồng bằng tài khoản thật/iPhone. Chưa chạy SQL remote, commit/push, triển khai hoặc làm Phase 8 tự động.
