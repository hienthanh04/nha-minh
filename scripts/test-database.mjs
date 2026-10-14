// A fresh, in-memory PostgreSQL instance. Never reads .env.local or contacts Supabase.
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const db = new PGlite({ extensions: { pgcrypto } });
try {
  // Minimal Supabase Auth infrastructure for database tests, not application login.
  await db.exec(`
    create schema storage;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text,unique(bucket_id,name));
    alter table storage.objects enable row level security;
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema storage to anon,authenticated;
    grant select,insert,update,delete on storage.objects to anon,authenticated;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(`begin;\n${(await readFile(new URL(file, folder), "utf8")).replace(/^\s*(begin|commit);\s*$/gmi, "")}\ncommit;`);
    console.log(`Migration PASS: ${file}`);
  }
  // Supabase grants anon SELECT by default. Reproduce that so RLS, not a missing
  // grant, must deny anonymous reads in these tests.
  await db.exec("grant select on all tables in schema public to anon;");
  const verification = await db.exec(await readFile(new URL("../supabase/verify-housework.sql", import.meta.url), "utf8"));
  const verificationRows = verification.flatMap(result => result.rows);
  if (verificationRows.length !== 9 || verificationRows.some(row => row.passed !== true)) throw new Error("Housework read-only verification failed");
  console.log("PASS: 9 read-only housework migration checks");
  const familyHousework = await db.exec(await readFile(new URL("../supabase/verify-family-housework.sql", import.meta.url), "utf8"));
  const familyChecks = familyHousework.flatMap(result => result.rows);
  if (familyChecks.length !== 5 || familyChecks.some(row => row.passed !== true)) throw new Error("Family housework permission verification failed");
  console.log("PASS: 5 family housework permission checks");
  const octoberVerification = await db.exec(await readFile(new URL("../supabase/verify-october-update.sql", import.meta.url), "utf8"));
  const octoberRows = octoberVerification.flatMap(result => result.rows);
  if (octoberRows.length !== 5 || octoberRows.some(row => row.passed !== true)) throw new Error("October update verification failed");
  console.log("PASS: 5 October dinner/housework checks");
  const foodVerification = await db.exec(await readFile(new URL("../supabase/verify-food.sql", import.meta.url), "utf8"));
  const foodVerificationRows = foodVerification.flatMap(result => result.rows);
  if (foodVerificationRows.length !== 10 || foodVerificationRows.some(row => row.passed !== true)) throw new Error("Food migration verification failed");
  console.log("PASS: 10 read-only food migration checks");
  const results = await db.exec(await readFile(new URL("../supabase/tests/permissions.sql", import.meta.url), "utf8"));
  const checks = results.flatMap((result) => result.rows).filter((row) => row.result === "PASS");
  if (checks.length < 20) throw new Error("Permission test results are incomplete");
  for (const check of checks) console.log(`PASS: ${check.test}`);
  console.log(`${checks.length} database checks passed; all fixtures rolled back.`);
  const kitchenResults = await db.exec(await readFile(new URL("../supabase/tests/kitchen.sql", import.meta.url), "utf8"));
  const kitchenChecks = kitchenResults.flatMap(result => result.rows).filter(row => row.result === "PASS");
  if (kitchenChecks.length < 30) throw new Error("Kitchen test results are incomplete");
  for (const check of kitchenChecks) console.log(`PASS: ${check.test}`);
  console.log(`${kitchenChecks.length} kitchen checks passed; fixtures rolled back.`);
  const dinnerResults = await db.exec(await readFile(new URL("../supabase/tests/dinner.sql", import.meta.url), "utf8"));
  const dinnerChecks = dinnerResults.flatMap(result => result.rows).filter(row => row.result === "PASS");
  if (dinnerChecks.length < 25) throw new Error("Dinner test results are incomplete");
  for (const check of dinnerChecks) console.log(`PASS: ${check.test}`);
  console.log(`${dinnerChecks.length} dinner checks passed; fixtures rolled back.`);
  const houseworkResults = await db.exec(await readFile(new URL("../supabase/tests/housework.sql", import.meta.url), "utf8"));
  const houseworkChecks = houseworkResults.flatMap(result => result.rows).filter(row => row.result === "PASS");
  if (houseworkChecks.length < 35) throw new Error("Housework test results are incomplete");
  for (const check of houseworkChecks) console.log(`PASS: ${check.test}`);
  console.log(`${houseworkChecks.length} housework checks passed; fixtures rolled back.`);
  const foodResults = await db.exec(await readFile(new URL("../supabase/tests/food.sql", import.meta.url), "utf8"));
  const foodChecks = foodResults.flatMap(result => result.rows).filter(row => row.result === "PASS");
  if (foodChecks.length < 30) throw new Error("Food test results are incomplete");
  for (const check of foodChecks) console.log(`PASS: ${check.test}`);
  console.log(`${foodChecks.length} food checks passed; fixtures rolled back.`);
  const profileVerification = await db.exec(await readFile(new URL("../supabase/verify-profiles.sql", import.meta.url), "utf8"));
  const rows = profileVerification.flatMap(r => r.rows);
  if (rows.length !== 6 || rows.some(r => r.passed !== true)) throw new Error("Profile verification failed");
  console.log("PASS: 6 read-only profile/storage setup checks");
  const profileResults = await db.exec(await readFile(new URL("../supabase/tests/profiles.sql", import.meta.url), "utf8"));
  const profileChecks = profileResults.flatMap(r => r.rows).filter(r => r.result === "PASS");
  if (profileChecks.length < 15) throw new Error("Profile test results incomplete");
  for (const check of profileChecks) console.log("PASS: " + check.test);
  console.log(profileChecks.length + " profile/storage policy checks passed; fixtures rolled back.");
  // Exercise the actual owner-run setup script in this disposable database.
  const adminSetup = await readFile(new URL("../supabase/setup-family-admins.sql", import.meta.url), "utf8");
  await assert.rejects(db.exec(adminSetup), /Expected exactly 5/);
  await db.exec("rollback;");
  await db.exec(`
    insert into auth.users(id)
      select ('fa000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid from generate_series(1,6)n;
    insert into profiles(id,display_name,role,member_slot)
      select ('fa000000-0000-0000-0000-' || lpad(n::text,12,'0'))::uuid,
        'TEST ' || n, case when n=1 then 'admin' else 'member' end::profile_role, n
      from generate_series(1,5)n;
  `);
  const before = (await db.query("select id,display_name,member_slot,avatar_path,profile_setup_at from profiles order by member_slot")).rows;
  await db.exec(adminSetup);
  assert.equal((await db.query("select count(*)::int as n from profiles where role='admin'")).rows[0].n, 5);
  assert.deepEqual((await db.query("select id,display_name,member_slot,avatar_path,profile_setup_at from profiles order by member_slot")).rows, before);
  const firstRun = (await db.query("select * from profiles order by member_slot")).rows;
  await db.exec(adminSetup);
  assert.deepEqual((await db.query("select * from profiles order by member_slot")).rows, firstRun);
  for (let slot=1; slot<=6; slot++) {
    await db.exec(`begin; set local role authenticated; set local request.jwt.claim.sub='fa000000-0000-0000-0000-${String(slot).padStart(12,"0")}';`);
    const access = (await db.query("select is_family_admin() as admin, (select count(*)::int from profiles) as visible")).rows[0];
    assert.equal(access.admin, slot<=5);
    assert.equal(access.visible, slot<=5 ? 5 : 0);
    await db.exec("rollback;");
  }
  console.log("PASS: family admin setup requires five profiles, preserves identity, is idempotent, grants all five admin access and excludes Auth-only users.");
} catch (error) {
  console.error(error.message, error.code ?? "", error.where ?? "");
  process.exitCode = 1;
} finally {
  await db.close();
}
