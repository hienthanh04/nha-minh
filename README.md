# Gia tộc Trần Anh — Phase 9 PWA & Deployment Preparation

A Vietnamese, mobile-first Next.js App Router app for five family members. All core features use Supabase. Phase 9 adds an online-only PWA manifest, project-owned icons and iPhone installation guidance. **Start with [PHASE9_DEPLOYMENT_CHECKLIST.md](PHASE9_DEPLOYMENT_CHECKLIST.md)** for exact Vercel, Supabase and iPhone steps, environment variables and smoke tests. Local preparation is complete; deployment and real-account/iPhone acceptance remain manual. No Phase 9 migration or database reset is needed.

Earlier setup: [AUTH_SETUP.md](AUTH_SETUP.md), [KITCHEN_SETUP.md](KITCHEN_SETUP.md), [DINNER_SETUP.md](DINNER_SETUP.md), [HOUSEWORK_SETUP.md](HOUSEWORK_SETUP.md), [FOOD_SETUP.md](FOOD_SETUP.md), [PHASE8_CHECKLIST.md](PHASE8_CHECKLIST.md). Only apply migrations not already applied; do not rerun them merely to deploy the frontend.

## Personal name and avatar update

Latest permission update (2026-09-27): all five family members can use **Phân công & sửa việc nhà**. Apply only the new migration and follow [HOUSEWORK_PERMISSIONS_UPDATE.md](HOUSEWORK_PERMISSIONS_UPDATE.md) before deploying this update. Other admin tools retain their existing permissions.

Follow [PROFILE_SETUP.md](PROFILE_SETUP.md) and apply `20260920000100_member_profiles.sql` once if not already applied. It creates the private avatar bucket and one-time introduction step. Members can later edit their own name/photo under **Khác → Hồ sơ của bạn**.

## Run locally

Use Node.js **24 LTS** and npm. Open a terminal in this directory:

```powershell
npm.cmd install
npm.cmd run dev
```

Open **http://127.0.0.1:3000/login**. The development server listens on your own computer only. If port 3000 is occupied, Next.js prints the alternate port it uses.

The current machine also has Node 26 on its default PATH. Select Node 24 before installing/running (for example `nvm use 24` if you use nvm). An installed Node 24 binary on this machine is `C:\Users\thanh\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe`.

## Check

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

To view the production build locally, run `npm run start` after building.

## Current screens

- **Hôm nay:** cooking/dish completion, delegation in duty details, dinner choices/check-in, all five dinner statuses, housework check-in, and food finish/receive with confirmation.
- **Lịch:** real kitchen week selector, duty details and late confirmation; real seven-day dinner planning; real housework assignment for the selected and following week.
- **Lịch sử:** real kitchen totals/member trace, personal dinner history, seven-day housework history and food batches (20 per page, newest first).
- **Khác:** real profile/logout and family members; admin kitchen, dinner, housework and food tools. Food administration is at `/khac/quan-tri/do-an`.

Kitchen, Dinner, Housework and Food actions persist in Supabase. No core feature uses mock data. Missing food configuration shows setup guidance, never fictional households.

Kitchen business dates and confirmation times use Asia/Ho_Chi_Minh. Home displays only today's current responsibilities. A missing schedule is explicitly distinguished from a scheduled week with no personal duty today. Kitchen fixtures have been removed.

Dinner plans and check-ins use separate existing tables. Missing plan means unknown. Server Actions derive the member from the verified session and refresh personal/family views after saving. RLS restricts writes; database triggers prevent contradictory plans/check-ins. Realtime and member undo are intentionally deferred; existing admin corrections remain available. The PWA requires an online connection; no service worker or offline write queue is installed.

## Code map

- `src/app/`: layout, Tailwind stylesheet and the four route pages.
- `src/components/`: app shell, reusable cards and feature components.
- `src/lib/date-format.ts`: shared Vietnam business dates, 24-hour display, correction inputs and midnight timing.
- `package.json`, `package-lock.json`: scripts and exact resolved dependencies.
- `src/lib/kitchen/`, `src/components/kitchen/`: real kitchen queries, actions, rules and mobile components.
- `src/lib/dinner/`, `src/components/dinner/`: real dinner queries, actions, rules, planner/history and corrections.
- `src/lib/housework/`, `src/components/housework/`: real weekly assignments, daily check-in, rotation and corrections.
- `src/lib/food/`, `src/components/food/`: event-driven food rotation, configuration, transitions and corrections.
- `FOOD_SETUP.md`, `supabase/verify-food.sql`: Phase 7 migration instructions and read-only checks for the family database.
- `HOUSEWORK_SETUP.md`, `supabase/verify-housework.sql`: Phase 6 migration instructions and read-only checks for the family database.
- `scripts/test-dinner.mjs`, `supabase/tests/dinner.sql`: dinner states, dates, consistency and database permissions.
- `SPEC.md`, `IMPLEMENTATION_PLAN.md`: agreed product rules and phased roadmap.

Copy .env.example to .env.local and set the Supabase URL and public key before login. Never commit .env.local. No service-role key is used.

## Phase 2 database foundation

Read [PHASE2_CHECKLIST.md](PHASE2_CHECKLIST.md) for the original walkthrough and [DATABASE_SETUP.md](DATABASE_SETUP.md) for policy details. On a new project, apply required migrations once in filename order. On the existing family project, use the read-only `supabase/verify.sql`; never run fixture tests there. No remote database has been changed by this Phase 9 work.

Run `npm.cmd run test:db` to execute all six existing migrations and permission checks in local, in-memory PostgreSQL. This never reads `.env.local` or contacts Supabase. Local build/lint success alone does not verify remote RLS.

The handwritten types in `src/lib/supabase/database.types.ts` include kitchen/housework/food RPC signatures and existing tables; relation joins are not modeled. All reads/writes use the signed-in user's session.

## Phase 3 code and verification

- `src/app/login/`: public Vietnamese form and login/logout Server Actions.
- `src/app/(family)/`: protected pages, layout and kitchen administration; URLs stay unchanged.
- `src/lib/auth/`: per-request session/profile validation and admin check.
- `src/proxy.ts`: SSR cookie refresh with private/no-store responses.
- `scripts/test-auth.mjs`: profile/role tests and optional anonymous HTTP smoke tests.
- [AUTH_SETUP.md](AUTH_SETUP.md): Dashboard setup, SQL placeholders, local run and real-account checklist.

Run `npm.cmd run test:auth`. Set TEST_BASE_URL to a running local server to include HTTP checks.
Local tests do not certify real account login, refresh tokens, logout or iPhone reopening. These require the manual checklist with administrator-provisioned accounts.

## Phase 4 release gate

Apply only the new migration `20260913000200_kitchen_operations.sql` if Phase 2 migrations are already applied. Follow [KITCHEN_SETUP.md](KITCHEN_SETUP.md) for all changed files and exact instructions. Local checks: 14 kitchen rule tests, 42 foundation DB tests, 38 kitchen DB tests, 10 auth/HTTP checks, lint/typecheck and production build pass. Remote migration, multi-account kitchen flows and real iPhone checks remain pending.
