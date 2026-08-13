import { decodeJpeg, encodeJpeg } from "./jpeg.js";
import { decodePng, encodePng } from "./png.js";
import {
  FIXTURE_HEIGHT,
  FIXTURE_WIDTH,
  SOURCE_PIXEL_PATTERN,
  sha256Hex,
  sourcePixels
} from "./pixels.js";
import { decodeLosslessWebp, encodeLosslessWebp } from "./webp.js";

export type GeneratedFormat = "image/jpeg" | "image/png" | "image/webp";

export interface GeneratedFixture {
  mime: GeneratedFormat;
  filename: string;
  bytes: Uint8Array<ArrayBuffer>;
  pixelDigest: string;
}

export interface GeneratedFixtureSet {
  pattern: typeof SOURCE_PIXEL_PATTERN;
  sourceDigest: string;
  jpeg: GeneratedFixture;
  png: GeneratedFixture;
  webp: GeneratedFixture;
}

export function decodePixels(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return decodeJpeg(bytes).rgb;
  if (bytes[0] === 137 && bytes[1] === 80) return decodePng(bytes).rgb;
  if (bytes[0] === 0x52 && bytes[1] === 0x49) return decodeLosslessWebp(bytes).rgb;
  throw new Error("Unsupported fixture image type");
}

export function pixelDigest(bytes: Uint8Array): string {
  return sha256Hex(decodePixels(bytes));
}

export function generateJpeg(): Uint8Array<ArrayBuffer> {
  return encodeJpeg(sourcePixels(), FIXTURE_WIDTH, FIXTURE_HEIGHT);
}

export function generatePng(): Uint8Array<ArrayBuffer> {
  return encodePng(sourcePixels(), FIXTURE_WIDTH, FIXTURE_HEIGHT);
}

export function generateWebp(): Uint8Array<ArrayBuffer> {
  return encodeLosslessWebp(sourcePixels(), FIXTURE_WIDTH, FIXTURE_HEIGHT);
}

function fixture(mime: GeneratedFormat, filename: string, bytes: Uint8Array<ArrayBuffer>): GeneratedFixture {
  return { mime, filename, bytes, pixelDigest: pixelDigest(bytes) };
}

export function generateFixtures(): GeneratedFixtureSet {
  return {
    pattern: SOURCE_PIXEL_PATTERN,
    sourceDigest: sha256Hex(sourcePixels()),
    jpeg: fixture("image/jpeg", "fixture.jpg", generateJpeg()),
    png: fixture("image/png", "fixture.png", generatePng()),
    webp: fixture("image/webp", "fixture.webp", generateWebp())
  };
}
