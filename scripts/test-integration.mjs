import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { vietnamToday, mondayOf, validBusinessDate, timeText, vietnamDateTimeInput, correctedVietnamTimestamp, millisecondsToVietnamMidnight } from "../src/lib/date-format.ts";

// Isolated rendering fixtures only. Never imported by the application; no network or Auth bypass.
// Actions must not run during a render. Real permissions/transitions are covered by test:db.
let pathname = "/";
globalThis.__testPathname = () => pathname;
const stub = source => ({ url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true });
registerHooks({
  resolve(specifier, context, next) {
    if (specifier === "next/link") return next("next/link.js", context);
    if (specifier === "next/form") return next("next/form.js", context);
    if (specifier === "next/navigation") return stub('export const usePathname=()=>globalThis.__testPathname(); export const useRouter=()=>({refresh(){},replace(){}});');
    if (/^@\/lib\/(kitchen|dinner|housework|food|profile)\/actions$/.test(specifier)) {
      const names = ["saveProfile", "completeDuty", "delegateDuty", "correctDuty", "saveKitchenSchedule", "checkInDinner", "setDinnerPlan", "adminSetDinnerPlan", "adminCorrectDinner", "checkInHousework", "saveHouseworkRotation", "assignHouseworkWeek", "correctHousework", "transitionFood", "saveFoodHouseholds", "initializeFood", "correctFood"];
      return stub(names.map(name => `export function ${name}(){throw Error("Action called while rendering");}`).join("\n"));
    }
    if (specifier.startsWith("@/")) specifier = new URL("../src/" + specifier.slice(2), import.meta.url).href;
    if ((specifier.startsWith("file:") || specifier.startsWith(".")) && !/\.(tsx?|mjs|js)$/.test(specifier)) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      for (const extension of [".tsx", ".ts"]) if (existsSync(path + extension)) return next(pathToFileURL(path + extension).href, context);
    }
    return next(specifier, context);
  },
  load(url, context, next) {
    if (url.startsWith("file:") && /\.tsx?$/.test(url) && !url.includes("node_modules")) {
      const source = ts.transpileModule(readFileSync(fileURLToPath(url), "utf8"), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
        fileName: fileURLToPath(url),
      }).outputText;
      return { format: "module", source, shortCircuit: true };
    }
    return next(url, context);
  },
});
const { HomeScreen } = await import("../src/components/home-screen.tsx");
const { KitchenHome } = await import("../src/components/kitchen/week-view.tsx");
const { DinnerHome } = await import("../src/components/dinner/views.tsx");
const { HouseworkHome } = await import("../src/components/housework/views.tsx");
const { FoodHome } = await import("../src/components/food/views.tsx");
const { AppShell } = await import("../src/components/app-shell.tsx");
const { ProfileEditor } = await import("../src/components/profile-editor.tsx");
const { Avatar } = await import("../src/components/avatar.tsx");
const el = React.createElement;
const render = node => renderToStaticMarkup(node);
const members = Array.from({ length: 5 }, (_, i) => ({ id: `fixture-${i}`, display_name: `Thành viên kiểm thử ${i + 1}`, member_slot: i + 1 }));
const profile = { ...members[0], role: "member" };
const today = "2026-09-21";
const kitchen = { week: today, today, duties: [], members, error: null };
const dinner = { today, from: today, to: today, members, plans: [], checkins: [], error: null };
const housework = { week: today, today, members, weeks: [], checkins: [], error: null };
const food = { households: [], current: null, batches: [], page: 0, hasMore: false, error: null };

test("First-login form requires name, offers optional file and the entry action", () => {
  const html = render(el(ProfileEditor, { profile, onboarding: true }));
  assert.match(html, /Lưu và vào Gia tộc Trần Anh/);
  assert.match(html, /Tên hiển thị/);
  assert.match(html, /type="file"/);
  assert.doesNotMatch(html.match(/<input[^>]*type="file"[^>]*>/)?.[0] ?? "", /required/);
  assert.match(render(el(ProfileEditor, { profile })), /Lưu hồ sơ/);
});
test("Avatar falls back to initial and uses authenticated local image route for a saved picture", () => {
  assert.match(render(el(Avatar, { id: "fixture", name: "Tên bạn" })), />T<\/span>/);
  const html = render(el(Avatar, { id: "fixture", name: "Tên bạn", path: "fixture/photo.jpg" }));
  assert.match(html, /src="\/anh-dai-dien\/fixture\?v=/);
  assert.doesNotMatch(html, /supabase\.co|object\/public/);
});

test("Home renders verified profile and all four modules in the required order", () => {
  const html = render(el(HomeScreen, { profile, today,
    kitchen: el(KitchenHome, { data: kitchen, profile }), dinner: el(DinnerHome, { data: dinner, profile }),
    housework: el(HouseworkHome, { data: housework, profile }), food: el(FoodHome, { data: food, admin: false }),
  }));
  let previous = -1;
  for (const text of ["Chào " + profile.display_name, "Việc của bạn hôm nay", "Ăn tối của bạn", "Tình hình ăn tối cả nhà", "Việc nhà tuần này", "Gửi đồ ăn"]) {
    const index = html.indexOf(text); assert.ok(index > previous, text); previous = index;
  }
  for (const member of members) assert.ok(html.includes(member.display_name));
  assert.match(html, /Tuần này chưa có lịch nấu\/rửa/);
  assert.match(html, /Tuần này chưa có phân công việc nhà/);
  assert.match(html, /Chưa thiết lập lượt gửi đồ ăn/);
  assert.doesNotMatch(html, /Bản xem thử|Em Hỉn|mock-data/);
});
test("Kitchen no assignment differs from missing schedule and keeps delegated responsibility", () => {
  const duty = { id: "duty", date: today, duty_type: "cook", slot_number: 1, assigned_to: members[1].id, delegated_to: null, completed_by: null, completed_at: null, status: "unconfirmed", updated_at: "2026-09-21T00:00:00Z" };
  assert.match(render(el(KitchenHome, { data: { ...kitchen, duties: [duty] }, profile })), /Hôm nay bạn không có công/);
  const html = render(el(KitchenHome, { data: { ...kitchen, duties: [{ ...duty, delegated_to: profile.id }] }, profile }));
  assert.match(html, /Làm thay cho Thành viên kiểm thử 2/);
  assert.match(html, />Đã làm<\/button>/);
});
test("Dinner displays all four states and names only waiting eaters in the save-food note", () => {
  const data = { ...dinner, plans: [1, 2, 3].map(i => ({ member_id: members[i].id, date: today, plan: i === 2 ? "not_eating" : "eating" })), checkins: [{ member_id: members[3].id, date: today, completed_at: "2026-09-21T11:35:00Z" }] };
  const html = render(el(DinnerHome, { data, profile }));
  for (const text of ["Chưa báo", "Có ăn • Chưa ăn", "Không ăn", "Đã ăn", "Nhớ để phần cho: Thành viên kiểm thử 2."]) assert.ok(html.includes(text), text);
});
test("Only assigned housework member gets today's button, completed record removes it", () => {
  const data = { ...housework, weeks: [{ week_start: today, responsible_member_id: profile.id }] };
  assert.match(render(el(HouseworkHome, { data, profile })), /Đã làm hôm nay<\/button>/);
  assert.doesNotMatch(render(el(HouseworkHome, { data, profile: { ...members[1], role: "member" } })), /Đã làm hôm nay<\/button>/);
  assert.doesNotMatch(render(el(HouseworkHome, { data: { ...data, checkins: [{ date: today, completed_at: "2026-09-21T11:35:00Z" }] }, profile })), /Đã làm hôm nay<\/button>/);
});
test("Ordinary members can open housework setup and correction without gaining daily responsibility", () => {
  assert.match(render(el(HouseworkHome, { data: housework, profile })), /href="\/khac\/quan-tri\/viec-nha"/);
  const data = { ...housework, weeks: [{ week_start: today, responsible_member_id: members[1].id }], checkins: [{ date: today, completed_at: "2026-09-21T11:35:00Z" }] };
  const html = render(el(HouseworkHome, { data, profile }));
  assert.match(html, /Sửa xác nhận việc nhà/);
  assert.doesNotMatch(html, /Hãy nhờ quản trị viên|Đã làm hôm nay<\/button>/);
});
test("Food waiting and active actions differ, finishing has a confirmation dialog", () => {
  const batch = { id: "batch", household_id: "house", status: "waiting", start_date: null, updated_at: "2026-09-21T00:00:00Z" };
  const data = { ...food, households: [{ id: "house", name: "Nhà kiểm thử", rotation_position: 0, is_enabled: true }], current: batch };
  assert.match(render(el(FoodHome, { data, admin: false })), /Đang chờ đồ từ/);
  const html = render(el(FoodHome, { data: { ...data, current: { ...batch, status: "active", start_date: today } }, admin: false }));
  assert.match(html, /Đồ ăn đã hết/); assert.match(html, /<dialog/); assert.match(html, /Xác nhận đồ ăn/);
  assert.doesNotMatch(html, /Thiết lập \/ sửa lượt/);
});
test("Nested admin routes keep Khác active without also activating Lịch", () => {
  pathname = "/khac/quan-tri/do-an";
  const html = render(el(AppShell, null, el("p", null, "Test")));
  assert.equal((html.match(/aria-current="page"/g) ?? []).length, 1);
  assert.match(html, /aria-current="page"[^>]*href="\/khac"/);
  pathname = "/";
});
test("Vietnam date, Monday and 24-hour display do not depend on host timezone", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(vietnamToday(new Date("2026-09-20T17:00:00Z")), today);
      assert.equal(mondayOf(vietnamToday(new Date("2026-09-20T16:59:59Z"))), "2026-09-14");
      assert.equal(timeText("2026-09-20T17:00:00Z"), "00:00");
      assert.equal(vietnamDateTimeInput("2026-09-20T17:00:00Z"), today + "T00:00");
    }
  } finally { if (original === undefined) delete process.env.TZ; else process.env.TZ = original; }
});
test("Midnight refresh waits for the next Vietnam day; calendar validation rejects overflow", () => {
  assert.equal(millisecondsToVietnamMidnight(new Date("2026-09-20T16:59:59Z")), 1100);
  assert.equal(millisecondsToVietnamMidnight(new Date("2026-09-20T17:00:00Z")), 86400100);
  assert.equal(validBusinessDate("2026-02-30"), false);
  assert.equal(validBusinessDate("2028-02-29"), true);
});
test("Unchanged correction input preserves seconds and precision; edited time uses Vietnam offset", () => {
  const original = "2026-09-21T11:35:27.123456+00:00";
  assert.equal(correctedVietnamTimestamp("2026-09-21T18:35", original), original);
  assert.equal(correctedVietnamTimestamp("2026-09-21T18:36", original), "2026-09-21T18:36:00+07:00");
  assert.equal(correctedVietnamTimestamp("", original), null);
});

// Optional static layout preview for Browser checks. Separate loopback-only server;
// no Supabase, credentials, mutations or production routes. Buttons are intentionally inert.
if (process.env.PHASE8_LAYOUT_PREVIEW === "1") {
  const { createServer } = await import("node:http");
  const { ScheduleEditor } = await import("../src/components/kitchen/schedule-editor.tsx");
  const { DinnerAdminEditor } = await import("../src/components/dinner/admin-editor.tsx");
  const { RotationEditor, HouseworkCorrection } = await import("../src/components/housework/admin-editor.tsx");
  const { HouseholdEditor, FoodCorrectionEditor } = await import("../src/components/food/admin-editor.tsx");
  const { InstallInstructions } = await import("../src/components/install-instructions.tsx");
  const directory = new URL("../.next/static/chunks/", import.meta.url);
  const css = readdirSync(directory).filter(p => p.endsWith(".css")).map(p => readFileSync(new URL(p, directory), "utf8")).join("\n");
  const longProfile = { ...profile, display_name: "Thành viên kiểm thử có tên hiển thị rất dài" };
  const duty = { id: "duty", date: today, duty_type: "cook", slot_number: 1, assigned_to: members[1].id, delegated_to: profile.id, completed_by: null, completed_at: null, status: "unconfirmed", updated_at: "2026-09-21T00:00:00Z" };
  const households = [{ id: "house", name: "Nhà kiểm thử có tên dài để kiểm tra xuống dòng", rotation_position: 0, is_enabled: true }];
  const batch = { id: "batch", household_id: "house", status: "active", start_date: today, finished_at: null, note: null, updated_at: "2026-09-21T00:00:00Z" };
  const home = el(HomeScreen, { profile: longProfile, today,
    kitchen: el(KitchenHome, { profile: longProfile, data: { ...kitchen, duties: [duty] } }),
    dinner: el(DinnerHome, { profile: longProfile, data: { ...dinner, plans: [{ member_id: profile.id, date: today, plan: "eating" }], members: [longProfile, ...members.slice(1)] } }),
    housework: el(HouseworkHome, { profile: longProfile, data: { ...housework, weeks: [{ week_start: today, responsible_member_id: profile.id }] } }),
    food: el(FoodHome, { data: { ...food, households, current: batch }, admin: false }),
  });
  const section = (title, child) => el("section", { className: "card mb-4" }, el("h2", { className: "mb-3 font-bold" }, title), child);
  const admin = el("div", null,
    section("Phân công bếp", el(ScheduleEditor, { week: today, today, initial: [], members })),
    section("Sửa bữa tối", el(DinnerAdminEditor, { member: profile.id, date: today, today, plan: "eating", at: "2026-09-21T11:35:00Z" })),
    section("Thứ tự việc nhà", el(RotationEditor, { week: today, members, initial: members.map(m => m.id), effective: today })),
    section("Sửa việc nhà", el(HouseworkCorrection, { date: today, at: "2026-09-21T11:35:00Z" })),
    section("Nhà gửi đồ", el(HouseholdEditor, { households })),
    section("Sửa lượt đồ ăn", el(FoodCorrectionEditor, { batch, successor: null })),
  );
  const pages = {};
  for (const [path, node] of [["/", home], ["/admin", admin], ["/install", el(InstallInstructions)], ["/profile", section("Giới thiệu bạn với nhà mình", el(ProfileEditor, { profile, onboarding: true }))]]) {
    pathname = path === "/admin" ? "/khac/quan-tri" : "/";
    pages[path] = '<!doctype html><html lang="vi"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Kiểm tra bố cục — dữ liệu giả lập</title><style>' + css + '</style><body>' + render(el(AppShell, null, el("p", { className: "preview-note mb-4" }, "Chỉ kiểm tra bố cục · dữ liệu thử · nút không lưu"), node)) + '</body></html>';
  }
  pathname = "/";
  createServer((req, res) => { res.setHeader("Content-Type", "text/html; charset=utf-8"); res.end(pages[req.url] ?? pages["/"]); }).listen(3011, "127.0.0.1", () => console.log("Static fixture layout preview: http://127.0.0.1:3011/ and /admin"));
}
