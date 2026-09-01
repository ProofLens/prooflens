import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { generateFixtures } from "./generate.js";

const outDir = resolve(import.meta.dirname, "../generated");
const fixtures = generateFixtures();
await mkdir(outDir, { recursive: true });
await writeFile(resolve(outDir, fixtures.jpeg.filename), fixtures.jpeg.bytes);
await writeFile(resolve(outDir, fixtures.png.filename), fixtures.png.bytes);
await writeFile(resolve(outDir, fixtures.webp.filename), fixtures.webp.bytes);
process.stdout.write(JSON.stringify({
  sourceDigest: fixtures.sourceDigest,
  jpeg: { bytes: fixtures.jpeg.bytes.byteLength, pixelDigest: fixtures.jpeg.pixelDigest },
  png: { bytes: fixtures.png.bytes.byteLength, pixelDigest: fixtures.png.pixelDigest },
  webp: { bytes: fixtures.webp.bytes.byteLength, pixelDigest: fixtures.webp.pixelDigest }
}, null, 2) + "\n");
