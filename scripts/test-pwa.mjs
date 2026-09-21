import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import sharp from "sharp";

// Transpile the two pure modules without installing an additional test framework.
const source = readFileSync(new URL("../src/app/manifest.ts", import.meta.url), "utf8")
  .replace('"../lib/app-info"', JSON.stringify(new URL("../src/lib/app-info.ts", import.meta.url).href));
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { default: manifest } = await import("data:text/javascript," + encodeURIComponent(js));

test("Manifest starts at the protected root with Vietnamese standalone identity", () => {
  const data = manifest();
  assert.equal(data.name, "Gia tộc Trần Anh");
  assert.equal(data.short_name, data.name);
  assert.equal(data.lang, "vi");
  assert.equal(data.start_url, "/");
  assert.equal(data.scope, "/");
  assert.equal(data.display, "standalone");
  assert.ok(data.description);
});

test("All declared icons and Apple/browser icons are real opaque PNGs of the correct size", async () => {
  const files = manifest().icons.map(icon => ["public" + icon.src, Number(icon.sizes.split("x")[0])]);
  files.push(["src/app/apple-icon.png", 180], ["src/app/icon.png", 32]);
  for (const [path, size] of files) {
    const metadata = await sharp(fileURLToPath(new URL("../" + path, import.meta.url))).metadata();
    assert.equal(metadata.format, "png", path);
    assert.equal(metadata.width, size, path);
    assert.equal(metadata.height, size, path);
    assert.equal(metadata.hasAlpha, false, path);
  }
});

const base = process.env.TEST_BASE_URL;
test("HTTP: manifest and all icons are public, with no login redirect or account cookie", { skip: !base }, async () => {
  const response = await fetch(new URL("/manifest.webmanifest", base), { redirect: "manual" });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /manifest\+json/);
  assert.equal(response.headers.get("set-cookie"), null);
  const data = await response.json();
  assert.deepEqual(data, manifest());
  for (const path of [...data.icons.map(icon => icon.src), "/apple-icon.png", "/icon.png"]) {
    const icon = await fetch(new URL(path, base), { redirect: "manual" });
    assert.equal(icon.status, 200, path);
    assert.match(icon.headers.get("content-type"), /image\/png/, path);
    assert.equal(icon.headers.get("set-cookie"), null, path);
    assert.equal((await sharp(Buffer.from(await icon.arrayBuffer())).metadata()).format, "png");
  }
});

test("HTTP: login includes install metadata while personal pages stay private", { skip: !base }, async () => {
  const response = await fetch(new URL("/login", base));
  assert.match(response.headers.get("cache-control"), /no-store/);
  const html = await response.text();
  assert.match(html, /<html lang="vi"/);
  assert.match(html, /rel="manifest" href="\/manifest.webmanifest"/);
  // Installed Next.js emits the standard mobile-web-app-capable tag.
  assert.match(html, /name="mobile-web-app-capable" content="yes"/);
  assert.match(html, /name="apple-mobile-web-app-title" content="Gia tộc Trần Anh"/);
  assert.match(html, /rel="apple-touch-icon"/);
  assert.match(html, /viewport-fit=cover/);
  const root = await fetch(new URL("/", base), { redirect: "manual" });
  assert.equal(new URL(root.headers.get("location"), base).pathname, "/login");
  assert.match(root.headers.get("cache-control"), /no-store/);
});
