# Nhà Mình — Phase 1 UI prototype

A Vietnamese, mobile-first Next.js App Router prototype for five fictional family members. The UI remains mock-data-only. Phase 2 now adds a local Supabase database foundation (migration, RLS policies, typed utilities and setup documentation); it is deliberately not connected to any page and does not implement authentication.

## Run locally

Use Node.js **24 LTS** and npm. Open a terminal in this directory:

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:3000**. The development server listens on your own computer only. If port 3000 is occupied, Next.js prints the alternate port it uses.

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

State lives in React memory and survives tab navigation. Reloading resets it. There is no login, member switching, server-side saving or access control in this UI-only phase; use fictional data only.

The header shows today's date in `Asia/Ho_Chi_Minh`, calculated on page load. On weekends, the kitchen card explicitly previews the preceding Friday so its one-tap interaction can be reviewed without assigning weekend kitchen work. On weekdays with no duty, it shows the no-duty state; the schedule shows all five weekdays. The fixture has exactly 15 original assignments, three per member, and includes a delegated historical duty.

Dinner plans and check-ins are separate in-memory values. Once checked in, a reload resets the sample; undo is intentionally deferred. Realtime, real administration, database rules, authentication and PWA installation/deployment are also deferred.

## Code map

- `src/app/`: layout, Tailwind stylesheet and the four route pages.
- `src/components/`: app shell, small reusable cards, Home, duty details and mock-state provider.
- `src/lib/mock-data.ts`: all fictional identities/fixtures, small date/display helpers and UI types.
- `package.json`, `package-lock.json`: scripts and exact resolved dependencies.
- `SPEC.md`, `IMPLEMENTATION_PLAN.md`: agreed product rules and phased roadmap; unchanged by this implementation.

No environment variables are needed to run the mock UI. The database client utilities only require variables when a later phase explicitly imports them. No PWA manifest/service worker, login or live-data integration is created yet.

## Phase 2 database foundation

Read [PHASE2_CHECKLIST.md](PHASE2_CHECKLIST.md) for the Vietnamese walkthrough and [DATABASE_SETUP.md](DATABASE_SETUP.md) for policy details. Run both SQL migrations in filename order; the second fixes member/admin permissions, date restrictions and allocation/history constraints. Then run `supabase/verify.sql` and, on an empty family database, the rollback-only `supabase/tests/permissions.sql`. No remote database has been changed by the assistant.

Run `npm.cmd run test:db` to execute both migrations and permission checks in local, in-memory PostgreSQL. This never reads `.env.local` or contacts Supabase. Real login/JWT checks remain Phase 3 work. Local build/lint success alone does not verify remote RLS.

The handwritten types in `src/lib/supabase/database.types.ts` are temporary and are not imported by the mock UI. Once a project exists, replace them with generated types using the Supabase CLI. The browser/server client helpers are also intentionally unused until authentication and feature integration phases.
