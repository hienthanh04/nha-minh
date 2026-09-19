import test from "node:test";
import assert from "node:assert/strict";
import { rotationPosition, validateOrder, houseworkStatus, validHouseworkDate } from "../src/lib/housework/rules.ts";
import { mondayOf, vietnamToday, addDays } from "../src/lib/kitchen/rules.ts";

const members = Array.from({ length: 5 }, (_, i) => ({ id: String(i), display_name: `TEST ${i}`, member_slot: i + 1 }));
const order = members.map(m => m.id);
test("Five-person rotation wraps A B C D E A", () => {
  assert.deepEqual(Array.from({ length: 6 }, (_, i) => rotationPosition("2026-09-14", addDays("2026-09-14", 7 * i))), [0, 1, 2, 3, 4, 0]);
});
test("Monday and Sunday share one responsible member", () => {
  assert.equal(rotationPosition("2026-09-14", "2026-09-20"), 0);
  assert.equal(mondayOf("2026-09-20"), "2026-09-14");
});
test("Next Monday advances to next member", () => assert.equal(rotationPosition("2026-09-14", "2026-09-21"), 1));
test("No rotation before effective week", () => assert.equal(rotationPosition("2026-09-14", "2026-09-13"), null));
test("Five different family members form a valid order", () => assert.equal(validateOrder(order, members), null));
test("Missing profile, duplicate, missing or unknown order entry is rejected", () => {
  for (const invalid of [order.slice(1), ["0", "0", "2", "3", "4"], ["0", "1", "2", "3", "unknown"]]) assert.ok(validateOrder(invalid, members));
  assert.ok(validateOrder(order, members.slice(1)));
});
test("Missing confirmation has no automatic failure meaning", () => assert.equal(houseworkStatus(null), "Chưa xác nhận"));
test("Confirmation displays completed", () => assert.equal(houseworkStatus("2026-09-14T13:15:00Z"), "Đã làm"));
test("Reject invalid calendar dates", () => {
  for (const value of [null, "2026-02-30", "2026-13-01", "15/09/2026"]) assert.equal(validHouseworkDate(value), false);
  assert.equal(validHouseworkDate("2028-02-29"), true);
});
test("Vietnam Sunday to Monday rollover uses Vietnam date", () => {
  const sunday = vietnamToday(new Date("2026-09-13T16:59:59Z"));
  const monday = vietnamToday(new Date("2026-09-13T17:00:00Z"));
  assert.equal(sunday, "2026-09-13");
  assert.equal(monday, "2026-09-14");
  assert.equal(mondayOf(sunday), "2026-09-07");
  assert.equal(mondayOf(monday), monday);
});
