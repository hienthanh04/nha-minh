# Phase 8 — Tích hợp, giao diện và độ tin cậy

Chỉ thực hiện Phase 8. Không thêm tính năng, migration, Realtime, Undo, PWA, triển khai, commit hoặc push trong phase này. Quy tắc nghiệp vụ giữ nguyên.

## Kết quả rà soát và thay đổi

- Home đã dùng dữ liệu thật từ bốn module. Giữ thứ tự: người dùng/ngày → bếp → bữa tối của bạn → cả nhà → việc nhà → gửi đồ ăn. Mỗi phần có trạng thái tải riêng; một truy vấn chậm không giữ lại toàn bộ Home.
- Phân biệt chưa có lịch với hôm nay không có công; giữ trách nhiệm theo người được nhờ, công thực tế theo `completed_by`, xác nhận muộn theo ngày công.
- Bỏ chữ “bản xem thử” và tên lớp CSS prototype. Module mock và provider đã bị loại khỏi runtime trong Phase 7; Phase 8 không phát hiện dữ liệu nghiệp vụ giả còn được dùng ở `src/`.
- Tab Khác sáng ở cả các trang quản trị con. Form chọn ngày/tuần dùng điều hướng Next, không tải lại toàn bộ trình duyệt; ô chọn ngày cập nhật theo tuần mới.
- Có nút **Cập nhật dữ liệu**, thông báo mất mạng, lỗi tải kèm thử lại và error boundary thân thiện. Không đưa lỗi PostgreSQL/Supabase nguyên văn lên giao diện, kể cả lỗi bếp.
- Nút thao tác thường ngày giữ một chạm; chặn cả bấm lặp tức thời và trong lúc chờ. Khi trình duyệt báo offline, thao tác bị từ chối ngay, không xếp hàng và không báo thành công. Server Actions/RLS vẫn quyết định kết quả cuối cùng.
- Food vẫn xác nhận trước khi báo hết. Admin sửa xác nhận vẫn phải tích xác nhận. Không thêm hộp thoại cho Đã làm/Tôi đã ăn/Đã làm hôm nay.
- Gom ngày/giờ về `src/lib/date-format.ts`: ngày Việt Nam, thứ Hai, kiểm tra ngày hợp lệ, hiển thị 24 giờ, input ngày giờ, thời gian tới nửa đêm. Phép tính UTC chỉ dùng để cộng ngày lịch hoặc đổi rõ ràng sang +07:00, không lấy ngày nghiệp vụ từ UTC/browser timezone.
- Sửa chi tiết: lưu chỉnh sửa với ô thời gian không thay đổi sẽ giữ nguyên giây và độ chính xác timestamp, không làm tròn xuống phút. Trạng thái thao tác bữa tối/việc nhà được đặt lại khi Home chuyển sang ngày khác.
- CSS xử lý tên dài, input ngày giờ, nút và checkbox dễ chạm; trạng thái bữa tối xuống dòng rõ trên màn hình nhỏ. Giữ khoảng trống dưới thanh điều hướng và safe area.
- Auth: vẫn xác minh bằng `getUser`, profile, vai trò và RLS. Lỗi kết nối Auth được phân biệt với chưa đăng nhập. Thao tác bếp trả tín hiệu đăng nhập lại giống các module khác, tránh nuốt redirect trong `catch` phía client.
- Quản lý hồ sơ chưa có trình sửa riêng trong app: tiếp tục cách thiết lập Supabase đã có. Phase 8 chỉ rà soát quyền, danh sách thật và tài liệu; không thêm tính năng quản trị.

## Làm mới dữ liệu, Realtime và Undo

Sau thao tác, các module tiếp tục `revalidatePath` và `router.refresh` để đọc kết quả đã lưu. Không dùng optimistic completion, bộ đếm cục bộ hay full-page reload.

Trang thường tự đọc lại khi quay lại app, lấy lại kết nối và qua nửa đêm Việt Nam. Listener/timer được tháo khi unmount. Khi app bị điện thoại tạm dừng, sự kiện trở lại foreground là đường phục hồi. Trang quản trị không tự refresh để giữ biểu mẫu chưa lưu; dùng nút cập nhật thủ công hoặc kết quả sau lưu. Lưu bản ghi cũ vẫn chịu kiểm tra quyền và điều kiện timestamp sẵn có.

**Realtime được hoãn có chủ đích.** Trạng thái bữa tối là ứng viên có ích nhất, nhưng hiện không có publication/subscription đã được kiểm chứng với dự án thật. Cơ chế đọc lại đã đủ cho năm người và không cần thêm cấu hình database trong đợt chỉnh UX. Khi cùng giữ Home ở foreground trên hai thiết bị, thiết bị còn lại cần bấm **Cập nhật dữ liệu** để thấy thay đổi; chưa có cập nhật tức thời giữa thiết bị.

**Không thêm Undo.** Giữ luồng quản trị sửa xác nhận với điều kiện bản ghi chưa đổi. Đồ ăn tiếp tục dùng sửa có kiểm tra lượt kế tiếp, không có nút hoàn tác chung.

## Tệp Phase 8

Tạo mới:

- `src/components/data-status.tsx`: nút cập nhật, lỗi tải, phản hồi lưu dùng chung.
- `src/components/data-refresh.tsx`: kết nối/foreground/ngày mới.
- `src/components/loading-card.tsx`, `src/app/(family)/error.tsx`: tải và lỗi trang.
- `scripts/test-integration.mjs`: kiểm tra render Home/các trạng thái/quyền hiển thị/tab/ngày giờ; bản xem bố cục thử tách khỏi app.
- `PHASE8_CHECKLIST.md`: báo cáo và hướng dẫn kiểm tra này.

Chỉnh sửa:

- `src/app/(family)/page.tsx`, `loading.tsx`, `khac/page.tsx` và bốn trang `khac/quan-tri`: tích hợp/lỗi/form ngày; `src/app/layout.tsx`, `globals.css`: metadata, bố cục.
- `src/components/app-shell.tsx`, `home-screen.tsx`, `schedule-screen.tsx`, `history-screen.tsx`: điều hướng, bỏ client boundary không cần thiết.
- `src/components/kitchen/{duty-card,schedule-editor,week-view}.tsx`, `dinner/{controls,admin-editor,views}.tsx`, `housework/{controls,admin-editor,views}.tsx`, `food/{controls,admin-editor,views}.tsx`: trạng thái thống nhất, thao tác, định dạng, cập nhật ngày.
- `src/lib/date-format.ts`, `kitchen/{rules,queries,actions}.ts`, `dinner/{rules,queries,actions}.ts`, `housework/{rules,queries,actions}.ts`, `food/actions.ts`: ngày dùng chung, ngày Home nhất quán, lỗi/quyền thao tác.
- `src/lib/auth/session.ts`, `src/app/login/{page.tsx,actions.ts}`: lỗi đăng nhập dễ hiểu.
- `scripts/test-auth.mjs`, `package.json`, `tsconfig.json`, `README.md`, `SPEC.md`, `IMPLEMENTATION_PLAN.md`.

Một số tệp Phase 7 đang có thay đổi chưa commit trước khi bắt đầu Phase 8, gồm migration food và việc xóa `mock-data.ts`/`prototype-provider.tsx`. Được giữ nguyên; không coi là migration mới của Phase 8. Không đổi dependency hay lockfile ở Phase 8.

Giữ fixture trong `scripts/test-*.mjs` và `supabase/tests/*.sql` vì cần kiểm tra quyền, trạng thái và dữ liệu thiếu. Fixture tích hợp chỉ có tên “Thành viên kiểm thử”, không có email/UUID thật. Preview bố cục là server loopback riêng, không có Supabase, không ghi dữ liệu, không nằm trong route production.

## Bằng chứng kiểm tra

- Auth: 10 kiểm tra, gồm HTTP 8 đường dẫn được bảo vệ và trang đăng nhập công khai không có signup.
- Bếp: 14; bữa tối: 9; việc nhà: 10; đồ ăn: 12; tích hợp/render/ngày giờ: 9.
- Database cục bộ: 188 kiểm tra nghiệp vụ/quyền + 19 kiểm tra cấu trúc housework/food; áp dụng đủ 5 migration vào database tạm, fixture rollback. Không chạy trên Supabase thật.
- Lint, typecheck, production build: PASS sau các thay đổi cuối. Lượt chạy chung có 62 PASS và 2 HTTP SKIP khi chưa đặt URL; hai HTTP test đã chạy riêng với server production cục bộ và đều PASS (tổng 64 kiểm tra TypeScript/render/HTTP).
- Browser: trang login production cục bộ đã mở. Kiểm tra **bố cục tĩnh của component thật với fixture riêng** cho Home và các biểu mẫu admin tại 375/390/393px: không tràn ngang, nút chính/điều hướng ≥44px, Khác active đúng. Chiều rộng nội dung thực tế 360/375/378px do scrollbar desktop. Đã xem screenshot phần trên/dưới Home và form ngày giờ quản trị.
- Không coi render fixture là kiểm tra đăng nhập, hydration hay lưu bằng tài khoản thật. Chưa xác nhận refresh/phiên đăng nhập/thao tác nhiều tài khoản trên Supabase thật và iPhone. Không có kiểm thử cạnh tranh hai kết nối thật; các kiểm tra lặp/stale đã có vẫn đạt.

## Chạy trên máy của bạn

Trong terminal VS Code/PowerShell tại thư mục `nha-minh`, dừng server cũ bằng Ctrl+C rồi chạy:

```powershell
$env:PATH = 'C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
npm.cmd run dev
```

Mở **http://127.0.0.1:3000/login** (hoặc cổng Next in ra). Phase 8 không có SQL mới để copy vào Supabase. Cần giữ nguyên cấu hình `.env.local` và các migration Phase 2–7 đã áp dụng.

Chạy kiểm thử:

```powershell
npm.cmd run test:auth
npm.cmd run test:kitchen
npm.cmd run test:dinner
npm.cmd run test:housework
npm.cmd run test:food
npm.cmd run test:integration
npm.cmd run test:db
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

Muốn chạy thêm HTTP auth, đặt `$env:TEST_BASE_URL='http://127.0.0.1:3000'` trước `test:auth`, trong khi server đang chạy. Không đặt thì hai test HTTP được ghi SKIP, không phải PASS.

## Checklist tài khoản thật trước Phase 9

Dùng dữ liệu đúng thực tế; chỉ bấm xác nhận hoàn thành khi công việc/ăn/nhận đồ thực sự diễn ra. Nếu chủ động kiểm thử thao tác sửa, ghi lại giá trị cũ và sửa lại bằng công cụ quản trị đang có. Không chạy SQL fixture lên database gia đình.

| Đánh dấu | Thao tác | Kết quả cần thấy |
| --- | --- | --- |
| [ ] | Đăng nhập admin rồi tải lại trang. | Vào Hôm nay, đúng tên, không phải đăng nhập lại. |
| [ ] | Đăng xuất rồi mở trực tiếp `/lich` và `/khac/quan-tri/do-an`. | Trở về login, không hiện dữ liệu gia đình. |
| [ ] | Đăng nhập tài khoản member; mở trực tiếp cả bốn trang quản trị. | Về Khác; không được sửa quản trị. |
| [ ] | Xem Home với cả năm hồ sơ. | Đủ sáu phần, đúng thứ tự; danh sách cơm có đủ năm người. |
| [ ] | Mở Lịch, chọn ngày khác/tuần trước/tuần sau. | Tuần và ô chọn ngày cùng đổi; thanh điều hướng giữ nguyên. |
| [ ] | Bếp: người phụ trách bấm Đã làm một lần rồi tải lại; thử bấm nhanh hai lần khi kiểm thử. | Một công và một thời điểm được lưu; không cộng hai lần. |
| [ ] | Bếp: người gốc nhờ người khác trong Chi tiết; đăng nhập người nhận. | Home đổi trách nhiệm, có “Làm thay cho…”. Người được nhờ không chuyển tiếp được. |
| [ ] | Bếp: người nhận xác nhận; xem Lịch sử tuần của ngày công. | Credit thuộc người làm; công gốc vẫn truy được; công chưa xác nhận còn xác nhận muộn được. |
| [ ] | Bữa tối: chọn Ăn rồi Không ăn trước khi check-in; thử ngày tương lai trong Lịch. | Hai lựa chọn lưu riêng theo ngày; ngày quá khứ chỉ xem. |
| [ ] | Bữa tối: chọn Ăn, bấm Tôi đã ăn rồi tải lại. | Đã ăn và giờ đã lưu; không đổi sang Không ăn khi chưa bỏ xác nhận qua admin. |
| [ ] | Một người đổi lựa chọn, người khác mở Home và bấm Cập nhật dữ liệu. | Trạng thái cả nhà/để phần phản ánh dữ liệu mới. Không kỳ vọng Realtime. |
| [ ] | Việc nhà: đăng nhập người được phân công và một người khác. | Chỉ người phụ trách có nút Đã làm hôm nay. |
| [ ] | Người phụ trách xác nhận hôm nay; xem lịch sử đủ bảy ngày. | Hôm nay có giờ; ngày chưa xác nhận không bị tính thất bại. |
| [ ] | Đồ ăn đang chờ: nhận bằng Đã gửi đồ. | Thành Đang dùng, có ngày nhận Việt Nam. |
| [ ] | Đồ ăn đang dùng: bấm hết rồi Hủy; sau đó xác nhận khi đúng thực tế. | Hủy không đổi gì; xác nhận chỉ tạo một lượt chờ cho nhà kế tiếp, có lịch sử. |
| [ ] | Admin sửa bản ghi đã xem; một tài khoản khác vừa cập nhật trước đó. | Thao tác dùng điều kiện timestamp từ chối ghi đè dữ liệu mới ở các luồng có kiểm tra stale. |
| [ ] | Tắt mạng bằng DevTools Offline, bấm một nút ngày thường. | Báo chưa lưu, không hiện thành công và không tự gửi khi có mạng lại. |
| [ ] | Bật mạng lại, quay lại tab sau khi người khác thay đổi dữ liệu. | Home đọc lại dữ liệu thật; trang quản trị giữ biểu mẫu chưa lưu. |
| [ ] | Để Home mở qua 00:00 Việt Nam hoặc đóng nền rồi mở lại ngày hôm sau. | Ngày/nút ngày thường đổi theo ngày mới; không ghi nhầm ngày cũ. |
| [ ] | Thu hồi phiên của tài khoản test qua quản trị Auth rồi thử thao tác. | Không báo thành công giả; phiên không hợp lệ trở về login. |
| [ ] | DevTools thiết bị 375/390/393px: xem đủ Home/Lịch/Lịch sử/Khác, mở Chi tiết và admin. | Không tràn ngang, không bị thanh dưới che nút cuối, tên dài đọc được, focus rõ. |
| [ ] | Form admin: nhập ngày giờ nhưng không đổi giá trị, chỉ sửa người/note khi cần. | Thời điểm cũ không bị làm tròn giây. Input native có thể theo định dạng hệ điều hành; giờ nghiệp vụ vẫn là Việt Nam. |
| [ ] | Kiểm tra Safari trên iPhone thật khi có URL truy cập được. | Bố cục, safe area, bàn phím và phiên mở lại hoạt động. Cài PWA/HTTPS thuộc Phase 9, chưa thực hiện ở đây. |

**Điều kiện còn chờ trước khi phát hành:** hoàn tất kiểm thử tài khoản thật, phục hồi mạng/phiên và iPhone ở bảng trên; xác nhận Supabase thật đã có đủ migration, năm hồ sơ và signup bị tắt. Kiểm tra cục bộ không thay thế các bước này. Chưa phát hiện lỗi tự động nào cần migration Phase 8; không bắt đầu Phase 9 trong lần làm này.
