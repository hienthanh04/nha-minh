import sharp from "sharp";
import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// Run manually after editing the project-owned SVG. Commit the resulting PNGs.
const source = await readFile(new URL("../assets/app-icon.svg", import.meta.url));
await mkdir(new URL("../public/icons/", import.meta.url), { recursive: true });
for (const [path, size] of [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-maskable-512.png", 512],
  ["src/app/apple-icon.png", 180],
  ["src/app/icon.png", 32],
]) {
  await sharp(source).resize(size, size).flatten({ background: "#076b60" }).png()
    .toFile(fileURLToPath(new URL("../" + path, import.meta.url)));
  console.log(`Generated ${path} (${size}×${size})`);
}
