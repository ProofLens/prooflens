import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export const FIXTURE_WIDTH = 32;
export const FIXTURE_HEIGHT = 32;
export const FIXTURE_CHANNELS = 3;
export const SOURCE_PIXEL_PATTERN = "xy-gradient-v1";

/** Deterministic 32×32 RGB source pixels used to generate JPEG, PNG, and WebP fixtures. */
export function sourcePixels(): Uint8Array<ArrayBuffer> {
  const pixels = new Uint8Array(FIXTURE_WIDTH * FIXTURE_HEIGHT * FIXTURE_CHANNELS);
  for (let y = 0; y < FIXTURE_HEIGHT; y += 1) {
    for (let x = 0; x < FIXTURE_WIDTH; x += 1) {
      const index = (y * FIXTURE_WIDTH + x) * FIXTURE_CHANNELS;
      pixels[index] = (x * 8) & 0xff;
      pixels[index + 1] = (y * 8) & 0xff;
      pixels[index + 2] = ((x + y) * 4) & 0xff;
    }
  }
  return pixels;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function sourcePixelDigest(): string {
  return sha256Hex(sourcePixels());
}

export async function loadOptionalPhotograph(): Promise<Uint8Array<ArrayBuffer> | undefined> {
  const candidates = ["photograph.jpg", "photograph.png", "photograph.webp"];
  for (const filename of candidates) {
    try {
      const bytes = await readFile(resolve(import.meta.dirname, "../examples", filename));
      return new Uint8Array(bytes);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return undefined;
}
