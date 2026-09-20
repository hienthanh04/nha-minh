import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareAvatar } from "../src/lib/profile/image.ts";

test("Avatar is resized, JPEG encoded and stripped of EXIF metadata", async () => {
  const input = await sharp({ create: { width: 1000, height: 800, channels: 3, background: "#076b60" } }).jpeg().withMetadata().toBuffer();
  const output = await prepareAvatar(input);
  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, 512); assert.equal(metadata.height, 512);
  assert.equal(metadata.exif, undefined);
  assert.ok(output.length < 524288);
});
test("Avatar rejects corrupt content, oversized input and SVG", async () => {
  await assert.rejects(prepareAvatar(Buffer.from("not a real photo")));
  await assert.rejects(prepareAvatar(Buffer.alloc(524289)));
  await assert.rejects(prepareAvatar(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')));
});
test("PNG photograph is converted into a JPEG avatar", async () => {
  const input = await sharp({ create: { width: 64, height: 64, channels: 4, background: "#ffffff" } }).png().toBuffer();
  const metadata = await sharp(await prepareAvatar(input)).metadata();
  assert.equal(metadata.format, "jpeg"); assert.ok(metadata.width <= 512);
});

const base = process.env.TEST_BASE_URL;
test("Anonymous avatar GET is denied and never publicly cached", { skip: !base }, async () => {
  const result = await fetch(new URL("/anh-dai-dien/11111111-1111-1111-1111-111111111111", base));
  assert.equal(result.status, 401); assert.match(result.headers.get("cache-control"), /private.*no-store/);
});
test("Anonymous onboarding and profile editor redirect to login", { skip: !base }, async () => {
  for (const path of ["/gioi-thieu", "/khac/ho-so"]) {
    const result = await fetch(new URL(path, base), { redirect: "manual" });
    assert.ok([303, 307].includes(result.status));
    assert.equal(new URL(result.headers.get("location"), base).pathname, "/login");
  }
});
