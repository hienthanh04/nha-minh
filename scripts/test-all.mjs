import { spawnSync } from "node:child_process";

// Separate processes keep the JSX render test's module stubs out of other tests.
for (const feature of ["auth", "kitchen", "dinner", "housework", "food", "integration", "profile", "pwa"]) {
  const result = spawnSync(process.execPath, ["--test", "--test-isolation=none", `scripts/test-${feature}.mjs`], { stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const database = spawnSync(process.execPath, ["scripts/test-database.mjs"], { stdio: "inherit" });
if (database.error) throw database.error;
process.exit(database.status ?? 1);
