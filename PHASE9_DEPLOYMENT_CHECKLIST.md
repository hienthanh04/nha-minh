# Gia tộc Trần Anh — Đưa app lên Vercel và cài trên iPhone

Phase 9: chuẩn bị PWA và triển khai. Giữ tên **Gia tộc Trần Anh** theo yêu cầu đổi tên; “Nhà Mình” trong mẫu yêu cầu là tên cũ. Không có migration mới ở Phase 9. Không reset, xóa hoặc tự dọn database.

## Kết quả audit trước khi sửa

| Mục | Kết quả |
| --- | --- |
| Framework | Next.js 16.3.5, App Router; React 19.3.0; TypeScript 6.0.3; Tailwind 4.3.3 |
| Node | `package.json` yêu cầu `24.x`; kiểm tra trên Node 24.19.0. Node mặc định của máy là 26, cần chọn 24 |
| Package manager | npm, đã có `package-lock.json`; không thêm dependency Phase 9 |
| Biến môi trường | URL Supabase + publishable key, hỗ trợ anon key cũ thay thế |
| PWA trước Phase 9 | Chưa có manifest, icon hay hướng dẫn cài trong Khác; đã có viewport và safe areas |
| URL cố định | Không có localhost/LAN/callback URL trong `src`; `127.0.0.1` chỉ dùng cho lệnh server cục bộ và kiểm thử |
| Dữ liệu thử | Chỉ trong `scripts/` và `supabase/tests/`; không nhập vào app production |
| Cấu hình build | Giữ hai tùy chọn build đã có: `workerThreads: true`, `useTypeScriptCli: false`, để tương thích môi trường máy hiện tại; không bỏ kiểm tra TypeScript |
| Build ban đầu | Đạt trước khi sửa Phase 9 |
| Kiểm tra mã nguồn | Không tìm thấy email thật, password viết cố định, private key/service-role token, debug log hay TODO chặn production trong source được rà soát. Không đọc/in `.env.local` |
| Git | Repo gốc chính là thư mục `nha-minh`; `.env.local` được ignore, không được tracked |

## PWA đã chuẩn bị

- `src/app/manifest.ts` → **`/manifest.webmanifest`**: name/short_name “Gia tộc Trần Anh”, `lang: vi`, `id`, `start_url`, `scope` đều `/`, `display: standalone`, theme/background `#f6f8f8`.
- `src/lib/app-info.ts`: tên và mô tả dùng chung cho metadata/manifest/hướng dẫn.
- `src/app/layout.tsx`: application name, Apple web-app metadata, status bar mặc định; giữ `viewport-fit=cover`, cho phép phóng to.
- `src/components/install-instructions.tsx`: hướng dẫn cài trong **Khác**.
- Icon tự vẽ ngôi nhà/trái tim, không tải artwork bên ngoài. Màu nền đặc, hình nằm giữa để phù hợp maskable.
- **Không service worker**, không offline cache hay hàng đợi ghi. Safari Add to Home Screen dùng manifest/metadata + HTTPS. Mất mạng khi app đang mở có thông báo; nếu mở mới hoàn toàn khi offline, có thể thấy lỗi mạng của trình duyệt vì app cần mạng để tải.
- Trang và ảnh cá nhân vẫn kiểm tra phiên, dùng `private, no-store`. Chỉ manifest, icon và tài nguyên giao diện công khai được phục vụ tĩnh.
- Giữ safe-area top/bottom và khoảng trống dưới nội dung cho thanh điều hướng cố định.

### Thay logo sau này

Sửa `assets/app-icon.svg`, rồi chạy `npm.cmd run icons:generate`. Commit cả SVG và các PNG sinh ra:

| Tệp | Kích thước / mục đích |
| --- | --- |
| `public/icons/icon-192.png` | 192×192, manifest |
| `public/icons/icon-512.png` | 512×512, manifest, độ phân giải cao |
| `public/icons/icon-maskable-512.png` | 512×512, nền kín và hình chính trong vùng an toàn ở giữa |
| `src/app/apple-icon.png` | 180×180, iPhone Home Screen; Next tự sinh link Apple touch icon |
| `src/app/icon.png` | 32×32, tab trình duyệt; Next tự sinh link icon |

Cũng có thể thay trực tiếp từng PNG đúng kích thước; lần chạy script tiếp theo sẽ ghi lại PNG từ SVG. Không chạy sinh icon ở mỗi lần deploy. iOS có thể giữ icon đã cài lâu hơn nội dung app; thay logo không đảm bảo icon cũ đổi ngay.

## 1. Chuẩn bị trước deploy

Mở terminal VS Code trong thư mục có `package.json` và `.git`:

```powershell
cd "C:\Users\thanh\Documents\Codex\2026-09-12\files-pasted-by-the-user-i\outputs\nha-minh"
git status --short
git check-ignore .env.local
git ls-files -- .env.local
```

`check-ignore` phải hiện `.env.local`; `ls-files` phải không có kết quả. Nếu `.env.local` đã được tracked, dừng trước khi push và xử lý loại khỏi Git; không chỉ thêm lại `.gitignore`.

Chọn Node 24. Với máy hiện tại, dùng đoạn sau trong PowerShell để gọi đúng npm bằng runtime 24 (không cần đổi execution policy):

```powershell
$env:PATH = 'C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin;' + $env:PATH
node --version
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' ci
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' test
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run lint
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run typecheck
node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js' run build
```

Chỉ chạy bước tiếp theo khi bước trước thành công. Nếu đã cài Node 24 làm runtime mặc định, có thể dùng `npm.cmd ci`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run build`.

`npm test` chạy unit/render/image/PWA và database kiểm thử PGlite tạm; không kết nối hoặc sửa Supabase thật. Các bài HTTP được bỏ qua khi chưa có `TEST_BASE_URL`.

### Kiểm tra HTTP với production build cục bộ

Terminal thứ nhất (Node 24):

```powershell
npm.cmd run start
```

Terminal thứ hai (Node 24):

```powershell
$env:TEST_BASE_URL = 'http://127.0.0.1:3000'
npm.cmd run test:pwa
npm.cmd run test:auth
npm.cmd run test:profile
Remove-Item Env:TEST_BASE_URL
```

Nếu máy vẫn dùng npm kèm Node 26, thay `npm.cmd` bằng `node 'C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js'` như trên. Chọn đúng cổng mà server in ra. Mở `/manifest.webmanifest` phải thấy JSON; `/login` phải có tên app mới. HTTP tests này không cần mật khẩu và không ghi dữ liệu.

### Commit và push thủ công

```powershell
git status
git diff --check
git diff
git add .
git diff --cached --stat
git diff --cached --name-only
git commit -m "feat: prepare family PWA for Vercel deployment"
git push origin main
```

Xem danh sách staged trước commit; không có `.env.local`, mật khẩu hoặc khóa bí mật. Chỉ push `main` khi đang ở đúng nhánh và các kiểm tra đã đạt. Phase 9 không tự commit/push cho bà.

## 2. Biến môi trường Vercel

| Tên | Phạm vi | Lấy ở đâu | Vercel |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client-visible | Supabase project → Settings → Data API/Connect: Project URL dạng `https://<project-ref>.supabase.co`, không phải URL dashboard | Bắt buộc, Production |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client-visible | Settings → API Keys → Publishable key | Bắt buộc, Production, trừ khi dùng anon thay thế |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-visible, tương thích cũ | Settings → API Keys → Legacy anon key | Chỉ dùng thay publishable key; không cần nhập cả hai |

Không có biến server-only bắt buộc. Không nhập secret key/service-role key vào bất kỳ biến `NEXT_PUBLIC_…` nào. Các public key vẫn cần RLS để bảo vệ dữ liệu. Không đưa giá trị thật vào Git/tài liệu/chat. Khi đổi biến client-visible trên Vercel phải redeploy để build nhận giá trị mới.

Production dùng Supabase project đang có tài khoản/dữ liệu. Chỉ cấp biến cho Preview nếu chủ động muốn preview dùng backend đó; thao tác trong preview cũng sẽ sửa cùng dữ liệu thật. Không cần bật preview cho gia đình dùng.

## 3. Deploy Vercel

1. Mở [Vercel](https://vercel.com/), đăng nhập và kết nối GitHub của bà.
2. Chọn **Add New → Project**, import repository GitHub hiện có của app.
3. **Framework Preset: Next.js** (auto-detect).
4. **Root Directory: `./`** vì Git repository hiện bắt đầu ngay trong `nha-minh`. Không điền đường dẫn Windows hoặc `outputs/nha-minh`. Nếu bà chuyển sang monorepo sau này, chọn thư mục thực sự có `package.json`.
5. Chọn **Node.js 24.x** trong Build/Deployment settings. `package.json` đã yêu cầu `24.x`; Vercel chọn patch 24 được hỗ trợ, không nhất thiết bằng patch cục bộ.
6. Giữ build settings chuẩn: npm theo lockfile, install tự động (`npm install` theo cấu hình nhận diện; nếu cần một lệnh explicit có thể chọn `npm ci`), build `npm run build`, output Next.js mặc định. Không đặt output `out`, không Static Export. Không cần `vercel.json` hay chạy `npm start` trên Vercel.
7. Thêm hai biến Production ở bảng trên bằng giá trị từ project Supabase đang dùng.
8. Bấm **Deploy**. Chờ trạng thái **Ready**, xem log nếu báo lỗi; không bỏ qua lỗi TypeScript để ép deploy.
9. Sao chép **URL HTTPS Production ổn định** trong mục Domains, tránh gửi link Preview của từng commit. Xác nhận Production Branch là `main`.
10. Mở URL trên điện thoại hoặc cửa sổ riêng tư. Nếu gặp màn hình yêu cầu đăng nhập Vercel, kiểm tra Deployment Protection của **Production** để người nhà truy cập được; vẫn giữ đăng nhập Supabase và RLS của app.

Build cục bộ đã đạt không thay thế kết quả build thật trên Vercel. Không có remote deploy tự động trong lần chuẩn bị này.

## 4. Kiểm tra Supabase sau khi có URL production

Không tạo lại database hoặc 5 tài khoản. Deploy frontend không làm mất dữ liệu và không yêu cầu chạy lại migration.

- [ ] Xác nhận biến Vercel trỏ đúng project Supabase gia đình hiện tại.
- [ ] **Authentication → URL Configuration → Site URL**: đặt URL HTTPS Production ổn định.
- [ ] Luồng hiện tại dùng email/password `signInWithPassword` và chuyển trang tương đối; **không có OAuth/magic-link/auth callback**. Không thêm một `/auth/callback` giả. Redirect allowlist chỉ cần cho luồng email/redirect thực sự được dùng; nếu cấu hình thì dùng URL production chính xác, không wildcard mọi domain. Có thể giữ URL localhost cần dùng phát triển. Phục hồi mật khẩu vẫn do admin hỗ trợ, app chưa có trang recovery.
- [ ] **Authentication → Sign In / Providers** (hoặc General configuration): tắt **Allow new users to sign up**; Email/password provider vẫn bật. Giữ tắt anonymous signup nếu có.
- [ ] Năm Auth users vẫn tồn tại, có email được xác nhận để đăng nhập; mỗi UUID khớp một `profiles.id`, slot 1–5, ít nhất một admin. Không đổi UUID hoặc tạo trùng account.
- [ ] Đã áp dụng các migration cần thiết của Phase 2–7 và hồ sơ **một lần**. Phase 9 không tạo SQL mới. Nếu thiếu thì xem tài liệu setup tương ứng và chỉ chạy migration chưa áp dụng.
- [ ] RLS bật trên cả 12 bảng ứng dụng; kiểm tra bằng `supabase/verify.sql` (chỉ đọc). `supabase/verify-profiles.sql` có 6 kết quả true; bucket `family-avatars` Private. Không chạy `supabase/tests/*.sql` hoặc fixture `verify-kitchen.sql` trên database gia đình.
- [ ] Lịch bếp, thứ tự việc nhà và vòng gửi đồ đã cấu hình bằng dữ liệu thật; các đợt/lịch sử hiện có giữ nguyên.
- [ ] Profile/avatar đã lưu được; nếu còn lỗi “Chưa có thiết lập hồ sơ”, xử lý migration/cache/schema hoặc cấu hình đúng project trước khi gửi link cho cả nhà.

## 5. Smoke test production — admin và member

Dùng ít nhất hai tài khoản trên hai thiết bị hoặc hai hồ sơ trình duyệt riêng biệt. Thao tác production sẽ lưu thật: xác nhận công việc/bữa ăn thực tế; không bấm “Đồ ăn đã hết” chỉ để thử nếu đồ chưa hết. Các kiểm tra âm tính/phá dữ liệu dùng database test, không làm trên dữ liệu gia đình.

- [ ] Chưa đăng nhập: mở `/`, `/lich`, `/lich-su`, `/khac`, `/khac/quan-tri` → `/login`; không hiện dữ liệu gia đình.
- [ ] Đăng nhập admin và member thành công. Lần đầu chưa giới thiệu → nhập tên/ảnh tùy chọn → Lưu → Home; lần sau không hỏi lại.
- [ ] Home đúng thứ tự: người dùng/ngày, việc của bạn, bữa tối cá nhân, cả năm người, việc nhà, gửi đồ.
- [ ] Kitchen: người có trách nhiệm xác nhận công thật, tải lại vẫn đã làm; nhờ làm hộ hiển thị đúng người; lịch sử tính công cho `completed_by`, công cũ chưa làm vẫn “Chưa xác nhận”.
- [ ] Dinner: thay lựa chọn hôm nay, cả nhà thấy trạng thái; “Tôi đã ăn” chỉ lưu khi có ăn; sau đã ăn không đổi thẳng sang không ăn.
- [ ] Housework: đúng người trong tuần có nút hôm nay; người khác chỉ xem; lịch sử tuần đủ bảy ngày.
- [ ] Food: nhà hiện tại/tiếp theo đúng; khi thực tế có nhận/hết, thực hiện chuyển trạng thái; hết có xác nhận, chỉ một lượt chờ mới.
- [ ] `/lich`, `/lich-su`, `/khac`: điều hướng/tải lại đúng; ảnh/tên và lịch sử hiển thị; mở hướng dẫn cài.
- [ ] Member mở trực tiếp `/khac/quan-tri` và trang admin con → bị chuyển về `/khac`; admin vào được.
- [ ] Đăng xuất → `/login`; nút Back/tải lại URL bảo vệ không cấp lại quyền xem/sửa.
- [ ] Supabase Auth user không có profile không được xem dữ liệu. Trường hợp này đã có local RLS tests; chỉ thử tài khoản phụ trên project test nếu cần, không mở signup để thử.
- [ ] Không có lỗi console mới trong luồng trên; không có credential xuất hiện trong log.
- [ ] Tắt mạng khi app đang mở: hiện mất kết nối, bấm thao tác không hiện lưu thành công giả. Bật mạng → cập nhật lại dữ liệu, thao tác chưa lưu phải bấm lại; không tự gửi hàng đợi.
- [ ] Mở `/manifest.webmanifest` không yêu cầu login, icon tải được; nội dung không có dữ liệu cá nhân.

### Hai thiết bị

1. Thiết bị A đăng nhập người A, báo Có ăn/Không ăn hôm nay.
2. Thiết bị B đăng nhập người B, mở Home hoặc bấm **Cập nhật dữ liệu** → thấy trạng thái A mới nhất.
3. Khi A thực sự hoàn thành công bếp, B cập nhật Home/Lịch → thấy hoàn thành và người thực hiện đúng.
4. Người phụ trách việc nhà xác nhận hôm nay; thiết bị còn lại cập nhật → thấy trạng thái mới.
5. Đến lúc nhận/hết đồ thực tế, A thực hiện; B cập nhật → cùng trạng thái nhà/đợt mới.

Realtime được hoãn, nên không yêu cầu màn hình B tự đổi ngay nếu đang mở liên tục. App refetch khi foreground/reconnect/ngày Việt Nam đổi và có nút cập nhật. Trang admin tránh tự refresh khi đang sửa.

## 6. Cài trên iPhone

1. Mở **URL HTTPS Production** bằng **Safari trên iPhone**. `127.0.0.1` trên iPhone không trỏ tới máy tính của bà.
2. Mở **menu trang / Chia sẻ** (biểu tượng ô vuông và mũi tên, vị trí tùy iOS).
3. Chọn **Thêm vào Màn hình chính**. Nếu không thấy, xem **Sửa tác vụ / Edit Actions**.
4. Bật **Mở dưới dạng ứng dụng web / Open as Web App** nếu iOS hiển thị tùy chọn này.
5. Giữ tên **Gia tộc Trần Anh**, bấm **Thêm**. iPhone có thể rút gọn nhãn dài dưới icon.
6. Mở icon trên màn hình chính; đăng nhập bằng tài khoản gia đình nếu được yêu cầu. Không giả định phiên Safari luôn chuyển sẵn sang app vừa cài.

Kiểm tra trực tiếp trên máy:

- [ ] Mở standalone, không có thanh URL Safari như tab thông thường; icon đúng.
- [ ] Nội dung không bị che bởi tai thỏ/home indicator; bottom navigation dễ bấm, không tràn ngang ở 375–393px.
- [ ] Bàn phím nhập email/tên không làm mất nút cần dùng; cuộn được khi cần.
- [ ] Đóng/mở lại app vẫn đăng nhập khi phiên còn hợp lệ. Nếu hết hạn/bị thu hồi hoặc dữ liệu trình duyệt bị xóa, đăng nhập lại; dữ liệu Supabase đã lưu không mất.
- [ ] Kitchen, Dinner, Housework, Food thao tác theo checklist production trên.
- [ ] Chọn ảnh điện thoại và lưu tên/ảnh thành công; HEIC nếu máy không đọc được thì chọn JPG/PNG.
- [ ] Cả năm người thử tài khoản của mình trước khi kết luận nghiệm thu cuối.

## 7. Cập nhật app về sau

Sửa code → tests/lint/typecheck/build → commit → push `main` → Vercel Git integration deploy Production theo nhánh đã cấu hình → kiểm tra URL ổn định.

Người nhà mở lại/tải lại app để nhận frontend mới, **không cần cài lại PWA sau cập nhật thông thường**. Tab đang mở có thể vẫn chạy bản cũ đến khi tải lại. Không thêm hệ thống update tùy biến. Nếu đổi domain, kiểm tra lại Supabase Site URL và shortcut đã cài. Migration tương lai nếu có là bước riêng, không tự chạy chỉ vì push frontend.

## Bằng chứng kiểm tra và phần còn lại

Tệp mới: `src/app/manifest.ts`, `src/lib/app-info.ts`, `src/components/install-instructions.tsx`, `assets/app-icon.svg`, năm PNG liệt kê ở trên, `scripts/generate-icons.mjs`, `scripts/test-pwa.mjs`, `scripts/test-all.mjs` và checklist này.

Tệp sửa: `src/app/layout.tsx`, `src/app/(family)/khac/page.tsx`, `.env.example`, `package.json`, `scripts/test-integration.mjs` (thêm trang fixture hướng dẫn cài), `README.md`, `SPEC.md`, `IMPLEMENTATION_PLAN.md`. Không đổi dependencies, lockfile hoặc migration.

- Production build trước và sau Phase 9 đạt trên Node 24.19.0; manifest và Apple/browser icons được build thành route tĩnh.
- `npm test`: unit/render/image/PWA và database PGlite đạt. Khi chưa chạy server có 6 bài HTTP skip có chủ đích; đã chạy lại `test:pwa`, `test:auth`, `test:profile` với server production cục bộ và cả 19 bài đạt, không skip.
- Lint và typecheck đạt. Test PWA xác minh PNG đúng kích thước, metadata theo Next.js 16.3.5, manifest/icons truy cập công khai, trang cá nhân không share-cache.
- Browser: login production ở 375/393px không tràn ngang, không có console error/warning trong lần mở kiểm tra. Home/admin được kiểm tra bằng fixture bố cục riêng ở 375/393px, không tràn ngang; thanh điều hướng khoảng 75px có khoảng đệm nội dung 82px, cả hai cộng safe-area trong CSS. Đây không phải mô phỏng Safari/iPhone hay kiểm thử đăng nhập thật.
- Database tests dùng PGlite và mô hình Auth/Storage để kiểm tra quyền, không chứng minh project Supabase từ xa đã cấu hình đúng.
- Chưa deploy Vercel, chưa đổi setting Supabase từ xa, chưa commit/push. Chưa xác minh phiên đăng nhập/ghi dữ liệu bằng tài khoản thật trên production hoặc cài trên iPhone thật.
- Không thấy blocker trong build/code cho việc bắt đầu deploy. Các checkbox dashboard, tài khoản thật và iPhone ở trên còn phải hoàn tất trước khi công bố MVP đã nghiệm thu đầy đủ.

## Tài liệu chính thức đã đối chiếu

- [Next.js PWA và manifest](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Vercel Node 24](https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions)
- [Supabase Site URL / Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
- [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration)
- [Apple: thêm website thành app trên iPhone](https://support.apple.com/en-za/guide/iphone/iphea86e5236/ios)
