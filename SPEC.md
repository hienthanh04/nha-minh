# Nhà Mình — Product specification

Status: Phases 1–4 accepted by the user. Phase 5 connects real dinner planning, check-ins, family status and admin corrections. Housework and Food remain mock data. No new migration is needed for Phase 5. Follow DINNER_SETUP.md for real-account checks; stop before Phase 6. Business rules below remain unchanged.

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
- Daily plan: unknown, eating (“Ăn”), or not eating (“Không ăn”). No plan record means unknown.
- Members can plan the seven-day week ahead and change today's choice. Ordinary editing of past plans is disabled.
- Unknown on Home: “Tối nay bạn có ăn không?” with “Ăn” and “Không ăn”.
- Eating on Home: “Bạn đã báo: Có ăn” and “🍽 Tôi đã ăn”. A successful check-in shows its time.
- Not eating: no eating check-in button. A secondary action changes today's choice.
- A check-in requires an eating plan. After check-in, changing to not eating requires correcting/removing the check-in first; do not silently erase it. Until simple undo is added, admins handle accidental check-ins.
- Everyone sees all five statuses: “❓ Chưa báo”, “❌ Không ăn”, “🍚 Có ăn • Chưa ăn”, or “✅ Đã ăn”.
- Only members with an eating plan and no check-in are shown as expecting food to be saved; unknown remains explicitly unknown.

### Housework

- One member is responsible for the entire Monday–Sunday week; responsibility rotates through all five and wraps after the fifth week.
- Admin configures order, start week and future weekly exceptions. Normal rotation edits do not rewrite historical assignments/check-ins.
- Home identifies the responsible member, or says “Tuần này tới lượt bạn”.
- Only that member sees “Đã làm hôm nay”. There is one possible check-in per date, including weekends.
- Store responsible member, date and completion timestamp. Members check in only for today; admins may correct history.
- Everyone sees today's check-in status and the selected week's daily history, including unconfirmed days.

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
- Family members can read coordination data. They may change only their own dinner records, complete their responsible kitchen duties, delegate their originally assigned unconfirmed duties, check in during their housework week and advance food batches.
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
