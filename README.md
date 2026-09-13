# Nhà Mình — Phase 3 Authentication

A Vietnamese, mobile-first Next.js App Router app for five family members. Phase 3 adds Supabase email/password login, persistent cookies, profile lookup and server-side member/admin authorization. Business cards still use the approved Phase 1 fixtures. Start with [AUTH_SETUP.md](AUTH_SETUP.md) to disable public signup and create the five accounts/profiles.

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
npm run lint
npm run typecheck
npm run build
```

To view the production build locally, run `npm run start` after building.

## Phase 1 UI prototype

- **Hôm nay:** cooking/dish completion, delegation in duty details, dinner choices/check-in, all five dinner statuses, housework check-in, and food finish/receive with confirmation.
- **Lịch:** read-only sample weekly kitchen/dinner/housework views.
- **Lịch sử:** sample work-credit totals, expandable member details, housework status and finished food batches. Home actions update these views.
- **Khác:** fictional members and a short explanation of the prototype.

Business fixture state lives in React memory and survives tab navigation. Reloading resets it. Login and the identity shown on Home/Khác now use a real Supabase profile; fixture actions do not save to the database.

The header shows today's date in `Asia/Ho_Chi_Minh`, calculated on page load. On weekends, the kitchen card explicitly previews the preceding Friday so its one-tap interaction can be reviewed without assigning weekend kitchen work. On weekdays with no duty, it shows the no-duty state; the schedule shows all five weekdays. The fixture has exactly 15 original assignments, three per member, and includes a delegated historical duty.

Dinner plans and check-ins remain separate in-memory values. Realtime, complete admin editors, real business actions and PWA installation/deployment remain deferred.

## Code map

- `src/app/`: layout, Tailwind stylesheet and the four route pages.
- `src/components/`: app shell, small reusable cards, Home, duty details and mock-state provider.
- `src/lib/mock-data.ts`: all fictional identities/fixtures, small date/display helpers and UI types.
- `package.json`, `package-lock.json`: scripts and exact resolved dependencies.
- `SPEC.md`, `IMPLEMENTATION_PLAN.md`: agreed product rules and phased roadmap; unchanged by this implementation.

Copy .env.example to .env.local and set the Supabase URL and public key before login. Never commit .env.local. No service-role key is used.

## Phase 2 database foundation

Read [PHASE2_CHECKLIST.md](PHASE2_CHECKLIST.md) for the Vietnamese walkthrough and [DATABASE_SETUP.md](DATABASE_SETUP.md) for policy details. Run both SQL migrations in filename order; the second fixes member/admin permissions, date restrictions and allocation/history constraints. Then run `supabase/verify.sql` and, on an empty family database, the rollback-only `supabase/tests/permissions.sql`. No remote database has been changed by the assistant.

Run `npm.cmd run test:db` to execute both migrations and permission checks in local, in-memory PostgreSQL. This never reads `.env.local` or contacts Supabase. Real login/JWT checks remain Phase 3 work. Local build/lint success alone does not verify remote RLS.

The handwritten types in `src/lib/supabase/database.types.ts` remain temporary. The server client now reads profiles using the signed-in user's session; feature tables remain disconnected.

## Phase 3 code and verification

- `src/app/login/`: public Vietnamese form and login/logout Server Actions.
- `src/app/(family)/`: protected pages, layout and admin placeholder; URLs stay unchanged.
- `src/lib/auth/`: per-request session/profile validation and admin check.
- `src/proxy.ts`: SSR cookie refresh with private/no-store responses.
- `scripts/test-auth.mjs`: profile/role tests and optional anonymous HTTP smoke tests.
- [AUTH_SETUP.md](AUTH_SETUP.md): Dashboard setup, SQL placeholders, local run and real-account checklist.

Run `npm.cmd run test:auth`. Set TEST_BASE_URL to a running local server to include HTTP checks.
Local tests do not certify real account login, refresh tokens, logout or iPhone reopening. These require the manual checklist with administrator-provisioned accounts. Phase 4 has not started.
