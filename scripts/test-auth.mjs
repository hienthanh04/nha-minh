import test from "node:test";
import assert from "node:assert/strict";
import { isFamilyProfile, canAccessAdmin } from "../src/lib/auth/profile.ts";

const profile = { id: "test-user", display_name: "Test member", role: "member", member_slot: 1 };

test("valid family profile matches verified Auth identity", () => {
  assert.equal(isFamilyProfile(profile, "test-user"), true);
});
test("missing profile is blocked", () => {
  assert.equal(isFamilyProfile(null, "test-user"), false);
});
test("another user's profile is blocked", () => {
  assert.equal(isFamilyProfile(profile, "different-user"), false);
});
test("invalid role is blocked", () => {
  assert.equal(isFamilyProfile({ ...profile, role: "owner" }, profile.id), false);
});
test("only five integer slots are accepted", () => {
  for (const member_slot of [0, 6, 1.5, "1"]) {
    assert.equal(isFamilyProfile({ ...profile, member_slot }, profile.id), false);
  }
});
test("blank display name is blocked", () => {
  assert.equal(isFamilyProfile({ ...profile, display_name: "  " }, profile.id), false);
});
test("member cannot access admin", () => {
  assert.equal(canAccessAdmin(profile), false);
});
test("admin can access admin", () => {
  assert.equal(canAccessAdmin({ ...profile, role: "admin" }), true);
});

const baseUrl = process.env.TEST_BASE_URL;
test("HTTP: anonymous visitors are redirected on all five protected routes", { skip: !baseUrl }, async () => {
  for (const path of ["/", "/lich", "/lich-su", "/khac", "/khac/quan-tri"]) {
    const response = await fetch(new URL(path, baseUrl), { redirect: "manual" });
    assert.ok([303, 307].includes(response.status), path + ": " + response.status);
    assert.equal(new URL(response.headers.get("location"), baseUrl).pathname, "/login");
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
});
test("HTTP: login form is public with password input and no signup form", { skip: !baseUrl }, async () => {
  const response = await fetch(new URL("/login", baseUrl));
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /type="password"/);
  assert.match(html, /autocomplete="current-password"/i);
  assert.doesNotMatch(html, /href="\/signup"/);
});

