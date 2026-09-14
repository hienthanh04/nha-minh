# Nhà Mình — Phase 4 Kitchen Duties

A Vietnamese, mobile-first Next.js App Router app for five family members. Authentication, profiles and kitchen schedules now use Supabase. Dinner, Housework and Food remain mock data. Start with [AUTH_SETUP.md](AUTH_SETUP.md) for accounts, then [KITCHEN_SETUP.md](KITCHEN_SETUP.md) for the new migration, first real schedule and two-account tests. Stop before Phase 5.

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
npm.cmd run test:kitchen
npm.cmd run test:db
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

To view the production build locally, run `npm run start` after building.

## Current screens

- **Hôm nay:** cooking/dish completion, delegation in duty details, dinner choices/check-in, all five dinner statuses, housework check-in, and food finish/receive with confirmation.
- **Lịch:** real kitchen week selector, duty details and late confirmation; sample dinner/housework views remain.
- **Lịch sử:** real kitchen totals and member trace; housework/food history remains mock.
- **Khác:** real profile/logout, a clearly labeled mock member list and admin kitchen schedule/template editors.

Dinner, Housework and Food fixture state lives in React memory and resets on reload. Kitchen actions persist in Supabase.

Kitchen business dates and confirmation times use Asia/Ho_Chi_Minh. Home displays only today's current responsibilities. A missing schedule is explicitly distinguished from a scheduled week with no personal duty today. Kitchen fixtures have been removed.

Dinner plans and check-ins remain separate in-memory values. Realtime, other feature editors and PWA deployment remain deferred.

## Code map

- `src/app/`: layout, Tailwind stylesheet and the four route pages.
- `src/components/`: app shell, small reusable cards, Home, duty details and mock-state provider.
- `src/lib/mock-data.ts`: all fictional identities/fixtures, small date/display helpers and UI types.
- `package.json`, `package-lock.json`: scripts and exact resolved dependencies.
- `src/lib/kitchen/`, `src/components/kitchen/`: real kitchen queries, actions, rules and mobile components.
- `SPEC.md`, `IMPLEMENTATION_PLAN.md`: agreed product rules and phased roadmap.

Copy .env.example to .env.local and set the Supabase URL and public key before login. Never commit .env.local. No service-role key is used.

## Phase 2 database foundation

Read [PHASE2_CHECKLIST.md](PHASE2_CHECKLIST.md) for the Vietnamese walkthrough and [DATABASE_SETUP.md](DATABASE_SETUP.md) for policy details. Run both SQL migrations in filename order; the second fixes member/admin permissions, date restrictions and allocation/history constraints. Then run `supabase/verify.sql` and, on an empty family database, the rollback-only `supabase/tests/permissions.sql`. No remote database has been changed by the assistant.

Run `npm.cmd run test:db` to execute all three migrations and permission checks in local, in-memory PostgreSQL. This never reads `.env.local` or contacts Supabase. Local build/lint success alone does not verify remote RLS.

The handwritten types in `src/lib/supabase/database.types.ts` include the kitchen RPC signatures; relation joins are not modeled. The server client reads profiles and kitchen data using the signed-in user's session.

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
