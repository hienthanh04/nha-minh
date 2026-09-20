# Tên và ảnh đại diện cá nhân

Bổ sung theo yêu cầu sau Phase 8, không bắt đầu PWA/deployment.

## Bà cần làm một lần trong Supabase

1. Mở file `supabase/migrations/20260920000100_member_profiles.sql` trong VS Code.
2. Copy **toàn bộ** nội dung. Mở đúng project Supabase → **SQL Editor → New query**, dán rồi bấm **Run**.
3. File đã có `BEGIN;` và `COMMIT;`, không bọc thêm. Không chạy lại các migration cũ. Bản mới giữ nguyên tài khoản và lịch sử, thêm 2 cột hồ sơ, một thao tác sửa riêng và bucket `family-avatars` cùng quyền truy cập.
4. Chạy `supabase/verify-profiles.sql` ở query mới: cả 6 dòng cần `passed = true`. Đây là kiểm tra chỉ đọc, không thêm người dùng thử.
5. Trong **Storage**, xác nhận có bucket `family-avatars` với trạng thái **Private**. Không chuyển sang Public hoặc thêm policy cho mọi người bên ngoài.
6. Chạy app lại rồi đăng nhập. Các tài khoản đã có trước cũng cần hoàn thành bước giới thiệu một lần. Sau lần lưu đầu, app không hỏi lại.

Không chạy file `supabase/tests/profiles.sql` trong database gia đình. File đó chỉ dành cho database kiểm thử tạm và được chạy bằng `test:db`.

## Chạy app

Trong terminal ở thư mục `nha-minh`, Ctrl+C server cũ, dùng Node 24 rồi:

```powershell
npm.cmd install
npm.cmd run dev
```

Mở http://127.0.0.1:3000/login. Nếu PowerShell đang dùng Node 26, máy này có Node 24 tại đường dẫn dưới. Cách gọi chính xác cả npm bằng Node 24:

```powershell
$env:PATH = 'C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' install
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run dev
```

## Luồng đã thêm

- Lần đầu: đăng nhập → `/gioi-thieu` → nhập tên/chọn ảnh → **Lưu và vào Gia tộc Trần Anh**.
- Tên bắt buộc, 1–60 ký tự sau khi bỏ khoảng trắng đầu/cuối.
- Ảnh không bắt buộc. Chưa có ảnh hoặc ảnh không tải được: dùng chữ cái đầu tên.
- Sau này: **Khác → Hồ sơ của bạn** (`/khac/ho-so`), đổi tên/ảnh hoặc bỏ ảnh.
- Avatar hiện trên Home, danh sách ăn tối và danh sách thành viên.
- Ảnh đầu vào tối đa 10 MB; trình duyệt cắt vuông giữa ảnh, thu nhỏ 512px, chuyển JPEG. Có preview trước khi lưu. JPG/PNG/WebP được hỗ trợ; HEIC phụ thuộc khả năng giải mã của trình duyệt, nếu không đọc được sẽ yêu cầu đổi sang JPG. Không có công cụ chỉnh crop thủ công.
- Server giải mã và chuyển ảnh JPEG lại, giới hạn pixel/dung lượng và loại metadata. Bucket chỉ nhận JPEG ≤512 KiB. Thêm dependency trực tiếp `sharp@0.35.4`, đã có sẵn qua Next; lockfile được cập nhật.

## Quyền và xử lý lỗi

- `save_my_profile` lấy người sửa từ `auth.uid()`, chỉ sửa tên/đường dẫn ảnh/thời điểm đã hoàn thành giới thiệu. Không nhận ID người khác, role hay slot từ biểu mẫu.
- Policy ghi thẳng vào profiles vẫn chỉ dành admin; member dùng hàm có kiểm tra quyền. Không thay đổi phân công, người hoàn thành hoặc bất kỳ UUID nào.
- Ảnh nằm dưới thư mục UUID của chủ ảnh, file mới có tên ngẫu nhiên. Không cho ghi đè object; chỉ xóa ảnh của mình khi không còn được hồ sơ tham chiếu.
- [Supabase private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals) dùng RLS cho quyền đọc/ghi. Ứng dụng phục vụ ảnh qua `/anh-dai-dien/[id]`, kiểm tra phiên và hồ sơ ở mỗi request; không tạo URL public/signed URL, không dùng service-role. Response `private, no-store` và `nosniff`.
- Đọc Storage chỉ cho family; Auth user không có profile và người chưa đăng nhập không đọc/upload được. Profile-save từ chối đường dẫn ảnh của người khác hoặc file chưa tồn tại.
- Lưu dùng timestamp đã xem để tránh ghi đè hồ sơ vừa thay đổi. Upload thất bại giữ nguyên hồ sơ cũ; lưu profile thất bại thử dọn ảnh vừa upload. Chỉ dọn ảnh cũ sau khi lưu thành công.
- Storage và profile không phải một transaction chung: mất kết nối bất chợt có thể để lại file không được dùng. Không báo lưu thành công giả; yêu cầu tải lại để xem kết quả. Policy xóa bảo vệ ảnh đang được dùng ngay cả khi kết quả mạng không rõ ràng. Với 5 người, không thêm job dọn file; quản trị viên có thể xử lý file không được tham chiếu nếu có.

## Tệp chính

- Migration mới và `supabase/verify-profiles.sql`, `supabase/tests/profiles.sql`.
- `src/app/gioi-thieu/page.tsx`, `src/app/(family)/khac/ho-so/page.tsx`, `src/app/anh-dai-dien/[id]/route.ts`.
- `src/components/profile-editor.tsx`, `avatar.tsx`.
- `src/lib/profile/actions.ts`, `image.ts`.
- Auth profile/session, layout bảo vệ, trang login, proxy, Home, Khác, dinner queries/views/types, database types.
- `scripts/test-profile.mjs`, `test-integration.mjs`, `test-database.mjs`, package/lockfile, SPEC/IMPLEMENTATION_PLAN/README và tài liệu này.

## Kiểm tra

Chạy `npm.cmd run test:profile`, `test:integration`, `test:db`, `lint`, `typecheck`, `build`. Kiểm tra HTTP với server đang chạy: đặt `$env:TEST_BASE_URL='http://127.0.0.1:3000'` rồi chạy `test:profile` và `test:auth`.

Database test dựng mô hình schema Storage để kiểm tra policy, không phải Supabase Storage service thật. Bài test thực tế sau migration vẫn cần:

- [ ] Đăng nhập tài khoản chưa giới thiệu, lưu tên và bỏ qua ảnh → vào Home có tên/chữ cái đầu đúng.
- [ ] Tải lại/đăng nhập lại → vào Home, không hỏi giới thiệu lần nữa.
- [ ] Vào Khác → Hồ sơ của bạn, chọn ảnh điện thoại → thấy preview → lưu → Home/Khác có ảnh.
- [ ] Một tài khoản gia đình khác thấy tên/ảnh mới sau cập nhật dữ liệu.
- [ ] Đổi ảnh lần nữa rồi bỏ ảnh → ảnh mới/chữ cái đầu đúng, không đổi lịch sử công việc.
- [ ] Chọn ảnh lỗi/ảnh >10 MB, tắt mạng khi lưu → báo lỗi, không hiện thành công giả.
- [ ] Mở URL `/anh-dai-dien/<UUID>` trong cửa sổ chưa đăng nhập → không có ảnh.
- [ ] Thử Safari iPhone: chọn JPG/PNG; thử HEIC, kiểm tra hướng ảnh, bàn phím, nút lưu, phiên mở lại.

Chưa chạy migration lên Supabase thật, chưa dùng ảnh/tài khoản thật để kiểm thử. Không triển khai, không commit/push tự động.

### Kết quả kiểm tra cục bộ

- Lint, typecheck và production build đạt trên Node 24.19.0.
- Database: 24 kiểm tra quyền hồ sơ mới và 6 kiểm tra cấu trúc mới đạt; các kiểm tra database hiện có cũng đạt.
- Kiểm tra xử lý ảnh, biểu mẫu, ảnh chữ cái đầu và HTTP bảo vệ đường dẫn hồ sơ/ảnh đạt.
- Bố cục biểu mẫu thử ở chiều rộng 375px không tràn ngang; nút lưu cao 48px. Kiểm tra qua DOM; công cụ chụp ảnh màn hình không trả được ảnh. Đây chưa phải kiểm thử tải ảnh trên iPhone thật.
