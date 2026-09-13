// A fresh, in-memory PostgreSQL instance. Never reads .env.local or contacts Supabase.
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const db = new PGlite({ extensions: { pgcrypto } });
try {
  // Minimal Supabase Auth infrastructure for database tests, not application login.
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth, public to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
  `);
  const folder = new URL("../supabase/migrations/", import.meta.url);
  for (const file of (await readdir(folder)).filter((name) => name.endsWith(".sql")).sort()) {
    await db.exec(`begin;\n${await readFile(new URL(file, folder), "utf8")}\ncommit;`);
    console.log(`Migration PASS: ${file}`);
  }
  // Supabase grants anon SELECT by default. Reproduce that so RLS, not a missing
  // grant, must deny anonymous reads in these tests.
  await db.exec("grant select on all tables in schema public to anon;");
  const results = await db.exec(await readFile(new URL("../supabase/tests/permissions.sql", import.meta.url), "utf8"));
  const checks = results.flatMap((result) => result.rows).filter((row) => row.result === "PASS");
  if (checks.length < 20) throw new Error("Permission test results are incomplete");
  for (const check of checks) console.log(`PASS: ${check.test}`);
  console.log(`${checks.length} database checks passed; all fixtures rolled back.`);
} catch (error) {
  console.error(error.message, error.code ?? "", error.where ?? "");
  process.exitCode = 1;
} finally {
  await db.close();
}
