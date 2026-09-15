# Nhà Mình — Simplified implementation plan

Status: Phases 1–4 accepted by the user. Phase 5 implemented locally using existing dinner constraints and RLS; no new migration. Real-account smoke-test instructions are in DINNER_SETUP.md. Housework/Food remain mock. Stop before Phase 6. The phase order and business requirements below remain unchanged.

The product rules in [SPEC.md](SPEC.md) are unchanged. Optimize for five known people and a beginner-maintainable codebase.

## Working approach

Before each coding phase, explain the change and name the likely files. Implement only that phase, run relevant checks, then report results and limitations. Phase 1 ends with the user's mobile UX review before connecting Supabase. Do not introduce authentication early to support a prototype.

Prefer route pages, reusable UI components, plain TypeScript business helpers and direct feature queries. Keep server/client boundaries visible. Do not introduce repository/service layers or generic state/mutation frameworks. Share only code that has an actual repeated use.

## Phase 1 — UI Prototype

- Set up Next.js App Router, TypeScript, Tailwind and npm on Node 24 LTS. Add lint/typecheck and record package versions.
- Build the mobile layout and four-item bottom navigation.
- Build Home in the specified six-section order, with functional mock one-tap interactions.
- Use local fixtures representing exactly five fictional people and representative duty, dinner, housework and food states. Keep fixtures in one clearly named mock-data module.
- Provide light mock schedule/history/other screens sufficient to navigate the proposed experience. Do not build real administration, login or account persistence.
- Use local state for duty completion, dinner selection/check-in, housework check-in and the confirmed food transition. Clearly identify the experience as a prototype; refresh can reset it.
- No Supabase, authentication, database, network persistence or backend scaffolding.
- Likely areas: route pages/layout, shared components, global styles, mock fixtures and package/config files.
- Verify: lint/typecheck/build; mobile viewport and bottom-navigation behavior; Home order; tap targets; all five dinner statuses; delegation detail placement; food confirmation; no network data dependency.
- Exit: show the working prototype for mobile UX validation. Address feedback before backend integration.

## Phase 2 — Supabase Database

- Create the schema, constraints, RLS and only the small SQL helpers needed for secure access and atomic business operations.
- Set up the typed Supabase client and generate types from the actual schema. Keep it disconnected from feature pages.
- Add migrations, `.env.example`, seed/setup instructions and database-test fixtures. Production account IDs/names are supplied by the administrator, not copied from prototype fixtures.
- Document manual creation of five Auth users/profiles, disabling signup, establishing an admin, configuring templates/rotation and starting the first food batch.
- Likely areas: Supabase migrations/tests, typed client utilities, generated types, environment example and README.
- Verify: migration on an empty test database; uniqueness/check constraints; strict weekly distribution; family-only reads; member/admin permissions; no role escalation or arbitrary writes through direct API calls.
- Exit: database is independently testable, with no feature UI integration and no login screen yet. SQL/Auth test identities do not constitute application authentication implementation.

## Phase 3 — Authentication

- Add email/password login for the five manually created users; no public signup.
- Add persistent cookie-based sessions, refresh handling, protected routes and member/admin checks.
- Reject authenticated users without a family profile. Expose sign out and administrator-assisted recovery guidance.
- Remove production access to the mock experience when authenticated feature integration begins; retain fixtures for tests/prototype development only.
- Likely areas: login route, authenticated layout/session boundary, Supabase server/browser clients and profile lookup.
- Verify: valid/invalid login; reopening a session; expired/revoked session; unknown Auth user; member/admin route access; anonymous database access denied.
- Exit: authenticated application shell works; domain feature integration remains in the following phases.

## Phase 4 — Kitchen Duties

- Connect weekly templates/schedules and admin week editing. Validate all 15 slots and exactly three original assignments per member in one save.
- Materialize complete weeks from the effective template when needed, using a simple idempotent transaction. Preserve existing week-specific edits on ordinary repeat requests.
- Phase 4 uses the preservation option: template edits explicitly keep all already-created weeks, including date-specific edits. Only missing future weeks use the effective template. Admins edit an existing week separately; any completion/delegation blocks whole-week replacement. Historical changes use explicit correction, not template propagation.
- Connect today's personal assignments and one-tap completion.
- Add original-assignee delegation controls, keeping `assigned_to`, `delegated_to` and `completed_by` distinct.
- Add actual-work summary, member drill-down and late confirmation. Trace totals directly through dated duty records.
- Add required admin correction of accidental kitchen records. Undo is not a dependency.
- Likely areas: kitchen components/actions/queries, schedule/history routes and kitchen business tests.
- Verify: 15 slots/three each; delegated credit; original assignment retained; late confirmation credited to duty week; future completion rejected; missing schedule distinct from no duty; repeated completion does not duplicate credit; unauthorized changes fail.
- Exit: kitchen workflow works end to end without Realtime.

## Phase 5 — Dinner

- Connect the seven-day personal planner with unknown/eating/not-eating states.
- Connect separate eating check-ins and one-tap Home actions.
- Show all five family statuses. Refresh saved data after actions and when returning to the app; live subscriptions are not needed yet.
- Prevent incompatible plan changes after check-in. Supply admin correction for accidental records before optional member undo.
- Likely areas: dinner components/actions/queries, planner and dinner-state tests.
- Verify: all four displayed states; own-record permissions; today/future plan edits; one check-in per member/date; check-in requires eating; failed save never shows success.
- Exit: planning, check-in and family status work without Realtime or undo.

## Phase 6 — Housework

- Connect the five-member weekly rotation, configured start week and admin future-week edits.
- Keep the dated weekly assignment as the source of truth for daily check-ins and history.
- Show the daily button only to the responsible member; enforce the same rule in the database.
- Add weekly history and admin corrections while preserving historical assignment consistency.
- Likely areas: housework components/actions/queries, rotation editor and rotation tests.
- Verify: five-week wraparound; Monday boundary in Vietnam time; seven daily history entries; one check-in per date; wrong-member and future-date rejection.
- Exit: weekly responsibility and daily completion both work end to end.

## Phase 7 — Food Rotation

- Connect ordered households and waiting/active/finished batches.
- Allow any family member to finish active food with confirmation and receive the next waiting batch.
- Finish-and-advance in one short transaction. Target the displayed batch ID, condition on its current state and create a successor only after the finish transition succeeds.
- Add household/order administration, batch history and accidental-record correction. Do not add food undo.
- Likely areas: food components/actions/queries, household editor and transition tests.
- Verify: event-based advancement; wraparound; single-household case; duplicate finish/receive requests; current household retained during reorder; exactly one unfinished batch; no orphaned history.
- Exit: the entire food lifecycle works without dates driving the rotation.

## Phase 8 — Integration & UX

- Finish the unified Home, navigation, details and admin corrections across all features.
- Add consistent loading, error, empty and offline-unsaved states. Refresh on foreground/reconnect and Vietnam date rollover.
- Improve mobile spacing, accessible dialogs, focus behavior and status wording after real interaction review.
- Optionally add narrowly scoped Supabase Realtime subscriptions after ordinary reads/writes pass. Refetch remains the recovery path; no custom synchronization engine.
- Add undo only for simple, safe completion/check-in reversals. Use a conditional operation targeting the saved record/timestamp; if it changed, refresh instead of overwriting it. Admin correction remains the fallback.
- Likely areas: shared UI, integrated Home, refresh helper, optional subscription/undo handlers and browser tests.
- Verify: full member/admin journeys; no accidental fixture data in production; network failure recovery; all-five visibility; optional Realtime disconnect recovery; optional undo cannot erase a newer edit.
- Exit: all core features pass with or without either enhancement. Clearly record whether Realtime/undo are included or deferred.

## Phase 9 — PWA & Deployment

- Add manifest, app icons (simple placeholders are sufficient), Apple touch icon and standalone display metadata.
- Add iPhone “Chia sẻ → Thêm vào Màn hình chính” instructions. Keep authenticated data uncached and mutations online-only.
- Configure Vercel and production environment variables, Supabase redirect URLs and signup settings. Match local/deployment Node versions.
- Complete setup/deployment README and final production build, lint/typecheck and relevant tests.
- Likely areas: manifest/metadata/icons, deployment settings, README and final smoke tests.
- Verify: protected production URL; five-account access; daily workflows; persistence after closing/reopening on a real iPhone; install icon/safe areas; no public data or signup; no embedded secrets.
- Exit: deployed app and documented smoke-test results. Report unavailable credentials/device checks as pending, never as passed.

## Database design: small and explicit

Retain normalized business tables. UUIDs are used where a natural/composite key is not sufficient; mutable rows have creation/update timestamps.

| Table | Minimum purpose/fields |
| --- | --- |
| `profiles` | Auth user FK/PK, display name, member/admin role, unique slot 1–5. |
| `kitchen_templates` | Effective-from Monday and template ID. Retain small dated versions so future edits have a defined start. |
| `kitchen_template_slots` | Template, weekday, duty type/slot and assigned member. |
| `kitchen_duties` | Date, type/slot, original assignee, delegate, completer, confirmation status/time. No separate week-marker FK; derive week from date. |
| `dinner_plans` | Member/date composite key and plan. Missing means unknown. |
| `dinner_checkins` | Member/date composite key referencing plan; completion timestamp. |
| `housework_rotations` | Effective-from Monday and rotation ID. Retain dated order changes to avoid rewriting history. |
| `housework_rotation_members` | Rotation, position 0–4, member; five unique members. |
| `housework_weeks` | Monday key, rotation reference and actual responsible member, including admin exceptions. |
| `housework_checkins` | Unique date, week, responsible member and timestamp. |
| `food_households` | Name, enabled flag and ordering position. |
| `food_batches` | Household, optional predecessor, waiting/active/finished state, start date, note and finish timestamp. |

### Constraints and writes

- Unique/check/FK constraints enforce profile slots, valid duty slots, per-date uniqueness, permitted states, completion-field consistency and valid references.
- A unique partial index permits at most one unfinished food batch; a unique predecessor reference prevents duplicate successors. Setup and the finish transaction maintain one after initialization.
- Cross-row rules such as exactly 15 duties and three per person cannot be enforced by an ordinary row `CHECK`. Validate them in a small whole-week/template transaction helper, and prevent unvalidated direct writes.
- Use a small protected operation/trigger for dinner plan/check-in consistency and housework assignment consistency. RLS alone is not a substitute for protecting individual fields or comparing old/new state.
- RLS grants family-only reads and appropriately scoped writes. Restrict table/column grants or expose a specific checked operation where a permissive direct write could change assignments, roles or credit.
- Derive completion actor from `auth.uid()`. If a privileged helper is necessary, keep it feature-specific, check membership/role, fix its search path and restrict execution grants.
- Prefer `ON CONFLICT DO NOTHING` for idempotent check-in inserts and conditional updates for completion/state changes; do not overwrite the original completion timestamp on retries.
- Use normal short PostgreSQL transactions for multi-row operations. Ordinary row locks taken by SQL statements are enough initially; no advisory locks, global lock layer or elaborate retry framework.
- For five users, a stale-state conflict can return a clear message and refresh the record. Never hide a failed write behind optimistic success.
- Do not assume several separate browser/client calls form one transaction. Whole-week saves and food finish-and-advance run as single database operations.
- Add indexes for actual date/member/history queries; do not add speculative indexes or persisted summary counters.

### Removed or simplified from the previous proposal

- **Remove `kitchen_weeks`:** it was a materialization marker. A complete week's dated duties are saved atomically; week boundaries are derived from dates. A missing week is detected by its rows, not another table.
- **Remove `kitchen_duty_events`:** no append-only event-log subsystem for MVP. Assignment, current delegation, actual completer and timestamps provide the requested work-credit trace. This deliberately omits a full timeline of intermediate edits, which was not a business requirement.
- **Retain the small template/rotation tables:** their effective dates support the already agreed future-change behavior. They are not a generic versioning service.
- **Simplify generation and writes:** feature-specific transactions, constraints and idempotent inserts replace the previously emphasized locking/concurrency machinery. Do not create a generic RPC dispatcher or event framework.
- **Keep `housework_weeks`:** unlike the removed kitchen marker, it contains a real assignment and preserves weekly exceptions/history.
- **Keep dinner plans/check-ins separate and food predecessor uniqueness:** both serve explicit business correctness, not scale.
- **Do not add undo infrastructure or subscription infrastructure to the schema:** enhancements belong in phase 8 and use the existing records.

## Verification and handoff

Run tests appropriate to the phase: pure business tests for counts/states/rotation, database tests for permissions and integrity, then a small set of browser flows. Add straightforward duplicate/stale-request cases for real shared actions; no load-testing project for hypothetical scale.

Final core checklist:

- [ ] Prototype reviewed before backend integration.
- [ ] Five manually provisioned users; persistent sessions; no public signup; family-only RLS.
- [ ] Repeating kitchen schedule, strict three-each allocation, delegation, actual credit and late confirmation.
- [ ] Separate dinner planning/check-in and all-five status display.
- [ ] Weekly housework rotation with daily responsible-member check-ins.
- [ ] Event-driven food rotation, confirmation and history.
- [ ] Admin editing/correction, readable mobile states and no false success on failed saves.
- [ ] Production build/typecheck/lint and relevant tests pass.
- [ ] PWA installation/session and production smoke tests completed or explicitly marked pending.

Optional enhancements, not MVP gates: Realtime and simple safe undo.
