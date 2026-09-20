import test from "node:test";
import assert from "node:assert/strict";
import { nextHousehold, validateHouseholds, foodStatus, foodPage } from "../src/lib/food/rules.ts";
import { vietnamToday } from "../src/lib/kitchen/rules.ts";

const households = ["A", "B", "C"].map((name, i) => ({ id: name, name, rotation_position: i, is_enabled: true, updated_at: "test" }));
test("Next enabled household follows order", () => assert.equal(nextHousehold(households, "A").id, "B"));
test("Last household wraps to first", () => assert.equal(nextHousehold(households, "C").id, "A"));
test("Disabled household is skipped", () => assert.equal(nextHousehold(households.map(h => ({ ...h, is_enabled: h.id !== "B" })), "A").id, "C"));
test("Current disabled household retains its place when finding next", () => assert.equal(nextHousehold(households.map(h => ({ ...h, is_enabled: h.id !== "B" })), "B").id, "C"));
test("Single enabled household cycles to itself", () => assert.equal(nextHousehold([households[0]], "A").id, "A"));
test("Missing configuration does not fabricate next household", () => assert.equal(nextHousehold([], "A"), null));
test("Zero enabled households is rejected", () => assert.ok(validateHouseholds(households.map(h => ({ ...h, is_enabled: false })))));
test("Duplicate positions are rejected", () => assert.ok(validateHouseholds(households.map(h => ({ ...h, rotation_position: 1 })))));
test("Valid order accepted and blank name rejected", () => {
  assert.equal(validateHouseholds(households), null);
  assert.ok(validateHouseholds([{ ...households[0], name: " " }]));
});
test("Food labels distinguish three states", () => assert.deepEqual(["waiting", "active", "finished"].map(foodStatus), ["Đang chờ", "Đang dùng", "Đã hết"]));
test("Receipt date uses Vietnam midnight", () => assert.equal(vietnamToday(new Date("2026-09-18T17:15:00Z")), "2026-09-19"));
test("Pagination rejects malformed page values", () => {
  assert.equal(foodPage("2"), 2);
  for (const value of ["-1", "NaN", "1.5", undefined]) assert.equal(foodPage(value), 0);
});
