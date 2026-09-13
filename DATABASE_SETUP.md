# Supabase database foundation (Phase 2)

This phase adds schema and security files only. The mock UI is still the application people can run. There is no login, no public signup, and no page query against Supabase yet.

**Updated 2026-09-13:** follow [PHASE2_CHECKLIST.md](PHASE2_CHECKLIST.md) for the Vietnamese walkthrough, both migrations, executable permission tests and commit commands. The second migration fixes the initial policies; do not stop after running the first file.

## Create a project

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Choose a strong database password and keep it in your password manager.
3. Open the project's **Connect** dialog for the Project URL and public Publishable key; the key is also under **Settings → API Keys**. The current utility reads `NEXT_PUBLIC_SUPABASE_ANON_KEY` for that publishable key.
4. Copy `.env.example` to `.env.local` and fill in:

```text
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-key
```

These are browser-safe public settings. Never put a service-role key in `.env.local` for this phase or commit real values.

## Run the migration

Run [20260912000100_initial_schema.sql](supabase/migrations/20260912000100_initial_schema.sql) followed by [20260913000100_fix_member_permissions.sql](supabase/migrations/20260913000100_fix_member_permissions.sql). If the initial migration already succeeded, run only the second. Do not rerun the initial migration or delete tables to retry.

### Supabase Dashboard

1. Open **SQL Editor → New query**.
2. Paste each complete migration file into a separate query, in filename order.
3. Wrap each file in `BEGIN;` and `COMMIT;`, run once and confirm that it completes without errors. If either file fails, stop and inspect the error before continuing.

### Supabase CLI (optional)

Install the CLI using its current official method, log in and link this project, then run:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Do not run this against a production project until you have reviewed the SQL and selected the intended project. This repository has not run the migration remotely.

## What the migration creates

- `profiles`
- `kitchen_templates`
- `kitchen_template_slots`
- `kitchen_duties`
- `dinner_plans`
- `dinner_checkins`
- `housework_rotations`
- `housework_rotation_members`
- `housework_weeks`
- `housework_checkins`
- `food_households`
- `food_batches`

The migrations create enums, update triggers, indexes, security helpers and integrity checks. The second migration adds deferred 15-duty/three-per-member week/template validation and a generated `housework_checkins.week_start` with a foreign key to the recorded weekly member. It adds no tables.

## Five users and initial setup (later authentication phase)

Do not put names or IDs in this repository. After Phase 3 begins, an administrator will:

1. Disable **Allow new users to sign up** in **Authentication → Providers → Email**.
2. Manually create exactly five email/password users in **Authentication → Users**.
3. Insert one `profiles` row per Auth user with slots 1–5; choose at least one `admin` role. Use real names only in the private Supabase project.
4. Add a repeating kitchen template and its 15 weekday slots, with exactly three original duties per member when a week is materialized.
5. Add the housework rotation order/start week and one `housework_weeks` assignment per week.
6. Add enabled food households and one initial `active` `food_batches` row. Keep only one unfinished batch.

For the first profile setup, an administrator can use the SQL Editor with the Auth UUIDs copied from the Users page. Do not expose the SQL or IDs publicly.

## RLS behavior

Every application table has RLS enabled. Anonymous requests and authenticated users without a `profiles` row receive no family rows. A profiled family member can read family coordination records.

- Profiles, templates, weekly assignments, household configuration and kitchen duties are admin-write only at this foundation stage.
- Members may edit only their own today/future `dinner_plans`, using the Vietnam date.
- Members may insert only their own dinner/housework check-ins for today, with the database's default completion timestamp. Check-ins are not member-editable/deletable until a safe undo workflow exists.
- Housework check-ins must match the recorded weekly member. A foreign key prevents editing/deleting that assignment while related check-ins exist.
- Admins can correct any member's dinner/housework records, including old dates, while obeying consistency constraints. Remove an accidental dinner check-in before changing its plan away from eating.
- Raw food-batch writes remain admin-only. The checked “finish and advance” operation is deferred to the food feature phase.
- Admin policies allow configuration/correction writes, subject to the constraints and triggers.

The `is_family_member()` and `is_family_admin()` helpers are `security definer` functions with a fixed `public` search path and execution granted only to authenticated users. They exist to keep policies readable and to avoid recursive profile policies; they are not a generic authorization layer.

## Type generation

The checked-in `src/lib/supabase/database.types.ts` is a temporary handwritten type shape so the client helpers are typed before a project exists. Once the project is linked, generate the authoritative version and replace that file:

```bash
supabase gen types typescript --linked > src/lib/supabase/database.types.ts
```

Review the generated diff. Keep `Database` imported by both client helpers. Do not change the mock fixture types to database types.

## Verification checklist

Run `npm.cmd run test:db` for an isolated in-memory PostgreSQL test; it never reads `.env.local`. Both migrations and the shared permission test script execute against real PostgreSQL roles in PGlite. The Supabase Auth tables/identity helper are minimal local substitutes; login/JWT issuance is not tested.

Then run `supabase/verify.sql` and the complete `supabase/tests/permissions.sql` on the intended Supabase project as described in PHASE2_CHECKLIST.md. The permission script requires empty `profiles`, seeds fake users without credentials, and rolls everything back. Local results do not prove remote setup succeeded.

- In **Table Editor**, confirm all 12 tables and enum-backed columns exist.
- In **Authentication → Users**, confirm no public signup is enabled and no production names have been committed here.
- Use `supabase/verify.sql` to confirm 12 RLS-enabled tables and the expected policies.
- As an unauthenticated client, confirm a `select` returns no family rows.
- With a profiled member session, confirm family reads work but admin-only configuration writes fail.
- Confirm invalid weekday/slot, duplicate duty/date slot, duplicate member/date dinner plan, invalid food status dates, duplicate unfinished food and non-responsible housework check-ins are rejected.

## Intentionally not implemented

Phase 2 does not add authentication screens, route protection, feature queries, schedule generation, kitchen completion/delegation operations, food advancement operations, Realtime, notifications, offline mutations or PWA deployment. No remote database has been changed by this repository.
