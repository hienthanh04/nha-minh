# Gia tộc Trần Anh — Product specification

Status: Phases 1–8 implemented. Phase 9 PWA/deployment preparation implemented locally; see PHASE9_DEPLOYMENT_CHECKLIST.md for validation and pending Vercel, real-account and iPhone checks. No Phase 9 migration. Approved follow-up changes are recorded below.

## Purpose and scope

A private family coordination PWA for exactly five known members. The primary experience is: open the app, see today's responsibilities, and perform common daily actions with one tap.

- Vietnamese interface, mobile-first, primarily iPhone Safari and Add to Home Screen.
- Next.js App Router, React, TypeScript and Tailwind CSS; Supabase PostgreSQL/Auth after the prototype; Vercel for deployment.
- Use stable compatible packages on Node 24 LTS; record resolved versions and commit the npm lockfile during implementation.
- All business dates use `Asia/Ho_Chi_Minh`. Weeks run Monday–Sunday. Store timestamps as `timestamptz` and display Vietnamese dates and 24-hour times.
- No multi-family platform, public signup, notifications, chat, points, gamification or offline mutations.
- Prefer plain components, direct queries and small feature-specific helpers. Realtime and undo are enhancements, not prerequisites for core correctness.

## Confirmed business rules

### Kitchen duties

- Monday–Friday, exactly two cooking slots and one dishwashing slot each day: 15 duties per week.
- Every published week initially assigns exactly three duties to each of the five members.
- Admin maintains a repeating weekday template and can edit a specific week's assignments. Whole-week edits must still satisfy the strict allocation rule.
- Template revisions take effect from a selected future Monday; initial setup may establish the starting week's template. Applying revisions must not silently erase date-specific edits, delegation or completion.
- Each dated duty records `date`, `duty_type`, `assigned_to`, nullable `delegated_to`, nullable `completed_by`, `status` and nullable `completed_at`.
- Responsibility is `delegated_to` when present, otherwise `assigned_to`.
- Home displays only the current user's responsible duties for today, including delegated duties. A delegated duty says “Làm thay cho [tên]”.
- One tap on “Đã làm” confirms a duty. Show “✅ Đã làm lúc …” only after successful saving.
- Delegation appears inside duty details or its three-dot menu, not as a primary Home action. The original assignee selects another family member; no acceptance workflow.
- Delegation preserves `assigned_to`. Only the original assignee can change/cancel delegation on an unconfirmed duty. Delegates cannot delegate onward; completed duties cannot be delegated.
- Actual work credit always belongs to `completed_by`. Weekly totals use the duty's date, even if confirmation happens later.
- Every member is compared against three: “Thiếu n”, “Đủ” or “Dư n”. Label the current week “Tạm tính”.
- Unconfirmed work remains “Chưa xác nhận”; never automatically classify it as failed or not performed.
- Responsible members can confirm past duties from schedule/history. Do not allow ordinary future completion.
- Member history includes duties assigned to them, duties delegated to them and duties they completed for others. The stored assignment/delegation/completion fields explain current totals; MVP does not require an audit of every intermediate edit.
- Without a configured schedule, show “Chưa có lịch”. With a schedule and no personal duty, show “Hôm nay bạn không có công nấu/rửa.”

### Dinner

- Keep dinner plans and eating check-ins as separate records.
- From 2026-10-14 (Vietnam date), no plan record means eating (“Có ăn”). Explicit not-eating choices always take precedence. Missing records before this date remain unknown to preserve history.
- Members can plan the seven-day week ahead and change today's choice. Ordinary editing of past plans is disabled.
- Home starts with “Bữa tối: Có ăn”, a one-tap “Không ăn” button and “🍽 Tôi đã ăn”. A successful check-in shows its time. Default eating never implies the member has already eaten or explicitly reported a plan.
- Not eating: hide the eating check-in button and show “Có ăn” to opt back in. Today/future planners offer these two choices; unknown remains historical only.
- A check-in requires an eating plan. After check-in, changing to not eating requires correcting/removing the check-in first; do not silently erase it. Until simple undo is added, admins handle accidental check-ins.
- Everyone sees all five statuses: “❓ Chưa báo”, “❌ Không ăn”, “🍚 Có ăn • Chưa ăn”, or “✅ Đã ăn”.
- Members with an explicit OR default eating plan and no check-in appear in the save-food list. When checking in under the default, create the eating plan and check-in in one transaction; respect RLS and never overwrite a saved not-eating choice. No scheduled job or mass insertion is needed.

### Housework

- One member is responsible for the entire Monday–Sunday week; responsibility rotates through all five and wraps after the fifth week.
- All five authenticated family members may configure order, start week and future weekly exceptions (approved 2026-09-27). Normal rotation edits do not rewrite historical assignments/check-ins.
- Home identifies the responsible member, or says “Tuần này tới lượt bạn”.
- Only that member sees “Đã làm hôm nay”. There is one possible check-in per date, including weekends.
- Store responsible member, date and completion timestamp. Ordinary check-ins remain today-only for the responsible person. All five members may explicitly add/edit/remove mistaken confirmations, including history, through the protected correction operation; corrections retain the recorded responsible member and reject future dates/times and stale edits.
- Everyone sees today's check-in status and the selected week's daily history, including unconfirmed days.
- Every family member can open “Phân công & sửa việc nhà” directly from Home, Lịch or Khác, even while someone else is responsible. This does not require promoting their role to admin. Deploying frontend code does not apply the Supabase housework permission migration.

### Food rotation

- External households are ordered senders, not application users.
- Rotation is event-based, never calendar-based. A batch is waiting, active or finished.
- Home shows the active household and next household; while waiting, show “Đang chờ đồ từ …”.
- All five members may use “Đồ ăn đã hết” and “Đã gửi đồ”. Only admins manage households/order and correct batches.
- Finishing requires confirmation. In one transaction, finish the active batch and create the next household's waiting batch.
- Receiving activates the waiting batch and records its start date. Store an optional note and finish timestamp.
- Exactly one unfinished batch exists after setup. Repeated requests must not create another successor.
- Maintain previous-batch history. Household order edits keep the current batch's household and affect subsequent advancement.
- Disable referenced households instead of deleting them. At least one must remain enabled; a single household rotates back to itself.

## Navigation and interaction

Bottom navigation:

| Page | Content |
| --- | --- |
| Hôm nay `/` | Current member/date; personal kitchen duties; own dinner controls; five-member dinner status; housework; food rotation, in that order. |
| Lịch `/lich` | Kitchen week, weekly dinner planner, housework rotation. |
| Lịch sử `/lich-su` | Weekly kitchen summary and member details, duty history, daily housework history, previous food batches. |
| Khác `/khac` | Profile, five family members, settings, installation instructions and sign out; admin links when authorized. |
| Administration `/khac/quan-tri` | Kitchen/housework schedules, household order, profile management and record corrections. |

Login is introduced in phase 3. Prototype navigation is unrestricted and uses only explicitly fictional fixture data.

Use friendly cards, readable Vietnamese, large tap targets, visible focus and iPhone safe-area spacing. Statuses use text/icons as well as color. Keep daily actions on Home and rare actions in details. Confirm important/destructive operations. Optional undo must never delay the MVP.

## Security and access

- Five accounts are manually created in Supabase Auth; `profiles` holds application names and member/admin roles.
- No public signup page; disable signup in Supabase as well.
- Persistent authenticated sessions, protected application routes and RLS on every application table.
- Anonymous users and authenticated accounts without a family profile cannot read family data.
- Family members can read coordination data. They may change only their own dinner records, complete their responsible kitchen duties, delegate their originally assigned unconfirmed duties, check in during their housework week and advance food batches. All five may also configure housework and explicitly correct its confirmations through checked operations, as approved on 2026-09-27.
- Admins additionally edit schedules, profiles, households and accidental records. Members cannot modify role/assignment/completion-credit fields arbitrarily or impersonate another member.
- Derive the actor from authentication. Enforce permissions in PostgreSQL, not only in the UI or Server Actions.
- Retain at least one administrator; do not offer account signup or deletion in the app. Password recovery is administrator-assisted.
- No secrets in Git or client bundles. Use a user-scoped Supabase client in normal application code; no service-role bypass for ordinary requests.

## Engineering boundaries

- Phase 1 is mock data and local component state only: no Supabase package/client, authentication, database, remote persistence or session simulation presented as real security.
- Fixture identities are fictional and never become production seed data. Refresh may reset prototype interactions.
- Use ordinary SQL constraints, idempotent inserts/upserts and short transactions. Use a small function/trigger only where a multi-row rule or protected state transition actually needs one.
- Do not build a generic mutation engine, event-sourcing system, advisory-lock framework, job scheduler or speculative scaling layer.
- Keep dinner tables separate and preserve concrete weekly housework assignments to protect history.
- First make core features correct with normal reads and refreshes. Optional Realtime comes in phase 8, with refetch on focus/reconnect/date change.
- Optional undo comes in phase 8 only where a simple conditional update/delete can safely target the unchanged record. Otherwise retain admin correction.
- PWA is installable and online-only. Do not cache authenticated responses or queue offline actions.

## Acceptance

All business rules above remain required. Tests cover weekly allocation/actual counts, delegated credit, late confirmation, separate dinner states, weekly rotation, event-based food transitions and unauthorized access. Final acceptance includes production build, lint/typecheck, iPhone installation/session checks and all-five-account smoke tests. Real account names, emails, schedules, household order, credentials and deployment configuration are setup inputs, not invented production defaults.

See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for phase order, schema decisions and verification gates.

## Approved follow-up — Personal name and uploaded avatar

- After first login, require the member to confirm their display name and optionally choose a photo before entering Home. Track completion once, including existing accounts when this update is applied.
- Name: 1–60 characters. Photo may be skipped or removed; use the initial as fallback.
- Later edits live at Khác → Hồ sơ của bạn. Only the authenticated member can change their own name/avatar through the member operation; role, slot, account ID and work history remain unchanged.
- Private Supabase Storage bucket, family-only reads, owner-only upload/delete of unused objects. Browser/server resize and re-encode JPEG; signed-in image endpoint uses private/no-store responses. No public URLs or service-role runtime key.
- Additive migration: 20260920000100_member_profiles.sql. See PROFILE_SETUP.md for applying it once and real-device verification. This was an explicitly requested addition after Phase 8.

## Phase 9 PWA identity

- App name and short name: Gia tộc Trần Anh (user-approved rename), language vi, standalone display, root start URL and scope.
- Native App Router manifest and local PNG/Apple icons; no third-party PWA framework, service worker, offline mutation queue or private response cache.
- Per the 2026-10-14 request, remove the entire installation-instructions card from Khác. PWA installation capability remains. Production HTTPS deployment and real iPhone session/install smoke tests follow PHASE9_DEPLOYMENT_CHECKLIST.md and remain manual until verified.

## Quyền quản trị cho cả gia đình — 27/09/2026

Yêu cầu mới: cả năm người có đầy đủ quyền admin, không chỉ sửa việc nhà.
Cấu hình năm hồ sơ hiện có thành `role = admin` bằng `supabase/setup-family-admins.sql`.
Xem [FAMILY_ADMIN_SETUP.md](FAMILY_ADMIN_SETUP.md). Giữ nguyên kiểm tra quyền,
RLS, đăng nhập và quy tắc nghiệp vụ; tài khoản không có hồ sơ vẫn bị chặn.
Các mô tả “admin” trong tài liệu áp dụng cho cả năm người sau bước cấu hình này.
Home bỏ câu “Cùng chăm chút cho nhà mình.”.
