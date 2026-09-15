import test from "node:test";
import assert from "node:assert/strict";
import { dinnerStatus, dinnerFor, validDinnerDate, validPlan, mayChangePlan } from "../src/lib/dinner/rules.ts";
import { vietnamToday, mondayOf, addDays } from "../src/lib/kitchen/rules.ts";

for (const [plan, at, label] of [
  ["unknown", null, "Chưa báo"],
  ["eating", null, "Có ăn • Chưa ăn"],
  ["not_eating", null, "Không ăn"],
  ["eating", "2026-09-14T12:00:00Z", "Đã ăn"],
]) test(`Dinner state: ${label}`, () => assert.equal(dinnerStatus(plan, at).label, label));

test("Missing plan remains unknown, without inventing a check-in", () => {
  assert.deepEqual(dinnerFor("one", "2026-09-14", [], []), { plan: "unknown", at: null });
});
test("Plans and check-ins are scoped to both member and business date", () => {
  const plans = [{ member_id: "one", date: "2026-09-14", plan: "eating" }];
  const checks = [{ member_id: "two", date: "2026-09-14", completed_at: "2026-09-14T12:00:00Z" }];
  assert.deepEqual(dinnerFor("one", "2026-09-14", plans, checks), { plan: "eating", at: null });
  assert.deepEqual(dinnerFor("one", "2026-09-15", plans, checks), { plan: "unknown", at: null });
});
test("Member planner permits today/future only; admin correction can use past", () => {
  assert.equal(mayChangePlan("2026-09-13", "2026-09-14"), false);
  assert.equal(mayChangePlan("2026-09-14", "2026-09-14"), true);
  assert.equal(mayChangePlan("2026-09-15", "2026-09-14"), true);
  assert.equal(mayChangePlan("2026-09-13", "2026-09-14", true), true);
});
test("Reject malformed dates, calendar overflow and unknown plan values", () => {
  for (const date of [null, "2026-02-30", "2026-13-01", "14/09/2026", "2026-9-14"]) assert.equal(validDinnerDate(date), false);
  assert.equal(validDinnerDate("2028-02-29"), true);
  assert.equal(validPlan("finished"), false);
  assert.equal(validPlan("unknown"), true);
});
test("Vietnam midnight starts a new Monday and seven-day planning week", () => {
  assert.equal(vietnamToday(new Date("2026-09-13T16:59:59Z")), "2026-09-13");
  const today = vietnamToday(new Date("2026-09-13T17:00:00Z"));
  assert.equal(today, "2026-09-14");
  assert.equal(mondayOf(today), today);
  assert.equal(addDays(today, 6), "2026-09-20");
});
