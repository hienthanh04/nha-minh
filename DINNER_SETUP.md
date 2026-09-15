# Phase 5 — Bữa tối: chạy và kiểm tra

Phase 5 chỉ chuyển bữa tối sang Supabase. Bếp giữ nguyên logic Phase 4. Việc nhà và đồ ăn vẫn là dữ liệu mẫu; chưa bắt đầu Phase 6.

## Có cần chạy SQL không?

**Không có migration mới. Không chạy lại migration cũ.** Ba migration của Phases 2–4 phải đã được áp dụng như hướng dẫn trước đó. Hai bảng `dinner_plans`, `dinner_checkins`, khóa chính, khóa ngoại, trigger và RLS hiện tại đã đáp ứng nghiệp vụ.

Không đổi `.env.local`, không tạo thêm tài khoản/hồ sơ nếu gia đình đã có đủ năm người. Không cần service-role key. Không đưa tên/UUID mẫu trong bài test vào database gia đình.

`supabase/tests/dinner.sql` là fixture cho database kiểm thử trống, **không copy vào SQL Editor của gia đình**. Chạy `npm.cmd run test:db` để thực thi tự động trong PostgreSQL tạm trên máy; script không đọc `.env.local`, không kết nối Supabase thật, và rollback dữ liệu kiểm thử.

## Chạy ứng dụng

Trong VS Code, mở thư mục `outputs/nha-minh`, chọn Terminal → New Terminal. Dừng server cũ bằng Ctrl+C ở terminal đang chạy server.

Dùng Node 24. Trên máy hiện tại có thể chọn runtime đã cài bằng:

```powershell
$env:PATH = 'C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node --version
npm.cmd run dev
```

Mở http://127.0.0.1:3000/login rồi đăng nhập. Nếu terminal báo cổng khác, dùng đúng cổng đó. Giữ terminal chạy trong khi dùng app. Không có dependency mới trong Phase 5; không cần cài lại nếu đã cài Phase 4.

## Dữ liệu và quyền

- Home đọc `profiles` theo `member_slot` cùng kế hoạch/xác nhận của ngày Việt Nam. Không dùng tên mẫu cho bữa tối. Nếu thiếu hồ sơ, hiển thị số hồ sơ thực tế thay vì tự thêm người.
- Thiếu dòng kế hoạch = Chưa báo. Có kế hoạch `eating`, chưa check-in = Có ăn • Chưa ăn. `not_eating` = Không ăn. `eating` kèm check-in = Đã ăn. Danh sách để phần chỉ tính người Có ăn nhưng chưa ăn.
- Lịch hiển thị bảy ngày thứ Hai–Chủ nhật của tuần đang chọn. Thành viên sửa hôm nay/tương lai bằng ba nút Ăn, Không ăn, Chưa báo. Chưa báo xóa kế hoạch khi chưa có check-in. Ngày cũ chỉ xem.
- Xác nhận ăn là thao tác riêng trên Home, không tự tạo kế hoạch. Database cấp timestamp hiện tại, khóa chính ngăn xác nhận trùng; thử lại không ghi đè giờ cũ.
- Server lấy UUID từ session đã xác minh, không nhận UUID để thành viên tự chọn người. RLS kiểm tra lại quyền ở database. Chỉ thao tác admin đã kiểm tra role mới nhận người cần sửa.
- Trigger yêu cầu kế hoạch Có ăn trước check-in và chặn đổi sang Không ăn khi còn check-in. Khóa ngoại chặn xóa kế hoạch đang được tham chiếu. Admin cũng phải bỏ check-in nhầm trước khi đổi kế hoạch. Sửa/bỏ check-in admin có điều kiện timestamp để không xóa bản ghi đã được người khác sửa.
- Sau thao tác, server revalidate và client refresh dữ liệu của trang; không cần tải lại toàn trang. Thiết bị khác cần tải lại để nhận thay đổi: chưa có Realtime/refresh khi quay lại ứng dụng. Refresh khi foreground, reconnect và qua nửa đêm thuộc Phase 8. Nếu màn hình cũ qua ngày mới, check-in bị từ chối và yêu cầu tải lại.
- Thành viên chưa có undo; mục “Sửa xác nhận nhầm” chỉ hướng dẫn nhờ admin. Admin mở Khác → Sửa bữa tối.

## Checklist kiểm tra bằng tài khoản thật

1. Đăng nhập admin. Home phải có bữa tối của bạn, tiếp theo là cả nhà với đủ năm tên thật. Phần bếp vẫn dùng lịch thật; việc nhà/đồ ăn vẫn ghi mẫu.
2. Nếu hôm nay Chưa báo, bấm **Không ăn**: hiển thị Không ăn và không có nút Tôi đã ăn. Bấm **Đổi lựa chọn → Ăn**: có nút Tôi đã ăn và tên bạn xuất hiện trong danh sách để phần.
3. Bấm **Tôi đã ăn**: hiện giờ Việt Nam và cả nhà thấy bạn Đã ăn; tên bạn biến mất khỏi danh sách để phần. Tải lại trang: giờ xác nhận không đổi. Không còn nút đổi trực tiếp sang Không ăn.
4. Mở **Lịch**: đổi vài ngày tương lai giữa Ăn/Không ăn/Chưa báo, tải lại kiểm tra đã lưu. Chọn tuần trước: các ngày cũ chỉ xem. Không thay đổi lịch bếp khi thử bữa tối.
5. Mở **Lịch sử**: kiểm tra ngày, kế hoạch và giờ xác nhận hôm nay. Chuyển tuần vẫn xem được cả lịch sử bếp cũ và bữa tối của tuần chọn.
6. Mở **Khác → Sửa bữa tối**. Chọn ngày/thành viên có check-in. Thử đổi thành Không ăn: phải báo cần bỏ xác nhận. Tích xác nhận, bấm **Bỏ xác nhận nhầm**, rồi đổi kế hoạch: lưu được. Thử sửa một ngày cũ bằng admin.
7. Đăng nhập tài khoản member ở cửa sổ riêng tư (tự nhập mật khẩu, không gửi mật khẩu vào chat). Thay đổi kế hoạch hôm nay: chỉ dữ liệu người đó đổi. Tải lại Home admin để thấy trạng thái mới. Member mở `/khac/quan-tri/bua-toi` phải trở về Khác, không thấy công cụ sửa người khác.
8. Tắt mạng rồi thử đổi kế hoạch: phải hiện lỗi, không báo đã lưu. Bật mạng và tải lại để xem dữ liệu thực tế. Đăng xuất rồi mở lại đường dẫn riêng tư phải trở về login.

Không tạo check-in giả chỉ để test trên ngày có dữ liệu thật; nếu thử thao tác nhầm, dùng công cụ admin để sửa lại đúng thực tế.

## Kiểm tra tự động và giới hạn

```powershell
npm.cmd run test:dinner
npm.cmd run test:kitchen
npm.cmd run test:db
npm.cmd run test:auth
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Kết quả cục bộ Phase 5: 9 tests dinner, 14 tests kitchen, 108 tests database (42 nền tảng + 38 kitchen + 28 dinner), 10 tests auth/HTTP đều đạt. Route admin bữa tối cũng đã được thử HTTP: anonymous bị chuyển về login, response có no-store. Lint, typecheck và production build đạt.

Database tests kiểm tra trạng thái không hợp lệ, quyền người khác, admin sửa lịch sử, tài khoản không có hồ sơ, anonymous, thao tác lặp và sửa với timestamp cũ. PostgreSQL tạm không thay thế kiểm thử session/browser thật hay xác nhận RLS trên Supabase đã triển khai; không có kiểm thử hai kết nối đồng thời trong bộ này. Chưa kiểm tra giao diện bữa tối sau đăng nhập bằng tài khoản thật trong lượt triển khai này.

Trước Phase 6, hoàn tất checklist tài khoản thật ở trên. Kiểm tra cài PWA/session reopening trên iPhone và deployment vẫn thuộc Phase 9.

## Các file Phase 5

Tạo mới:

- `src/lib/dinner/rules.ts`, `queries.ts`, `actions.ts`.
- `src/components/dinner/controls.tsx`, `views.tsx`, `admin-editor.tsx`.
- `src/app/(family)/khac/quan-tri/bua-toi/page.tsx`.
- `scripts/test-dinner.mjs`, `supabase/tests/dinner.sql`, `DINNER_SETUP.md`.

Cập nhật:

- Các page Home, Lịch, Lịch sử để tải dữ liệu bữa tối; Khác thêm link admin bữa tối.
- `home-screen.tsx`, `schedule-screen.tsx`, `history-screen.tsx`, `app-shell.tsx` để thay mock/ghi đúng phạm vi.
- `prototype-provider.tsx`, `mock-data.ts` xóa riêng dữ liệu/trạng thái bữa tối mẫu.
- `package.json`, `scripts/test-database.mjs` để chạy tests.
- `README.md`, `SPEC.md`, `IMPLEMENTATION_PLAN.md` cập nhật trạng thái Phase 5, không đổi nghiệp vụ.

Không sửa migration cũ, database types, chức năng bếp, logic việc nhà hoặc logic đồ ăn. Không commit/push tự động.
