import { createRequire } from "node:module";
import { FIXTURE_HEIGHT, FIXTURE_WIDTH, sourcePixels } from "./pixels.js";

const jpeg = createRequire(import.meta.url)("jpeg-js") as {
  encode: (image: { data: Buffer; width: number; height: number }, quality: number) => { data: Uint8Array };
  decode: (
    data: Uint8Array,
    opts: { useTArray: true; formatAsRGBA: boolean; tolerantDecoding: boolean }
  ) => { width: number; height: number; data: Uint8Array };
};

export function rgbToRgba(rgb: Uint8Array, width = FIXTURE_WIDTH, height = FIXTURE_HEIGHT): Uint8Array<ArrayBuffer> {
  const rgba = new Uint8Array(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    rgba[index * 4] = rgb[index * 3] ?? 0;
    rgba[index * 4 + 1] = rgb[index * 3 + 1] ?? 0;
    rgba[index * 4 + 2] = rgb[index * 3 + 2] ?? 0;
    rgba[index * 4 + 3] = 255;
  }
  return rgba;
}

export function rgbaToRgb(rgba: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const rgb = new Uint8Array(width * height * 3);
  for (let index = 0; index < width * height; index += 1) {
    rgb[index * 3] = rgba[index * 4] ?? 0;
    rgb[index * 3 + 1] = rgba[index * 4 + 1] ?? 0;
    rgb[index * 3 + 2] = rgba[index * 4 + 2] ?? 0;
  }
  return rgb;
}

export function encodeJpeg(rgb: Uint8Array = sourcePixels(), width = FIXTURE_WIDTH, height = FIXTURE_HEIGHT): Uint8Array<ArrayBuffer> {
  return new Uint8Array(jpeg.encode({ data: Buffer.from(rgbToRgba(rgb, width, height)), width, height }, 90).data);
}

export function decodeJpeg(bytes: Uint8Array): { width: number; height: number; rgb: Uint8Array<ArrayBuffer> } {
  const decoded = jpeg.decode(bytes, { useTArray: true, formatAsRGBA: true, tolerantDecoding: false });
  return { width: decoded.width, height: decoded.height, rgb: rgbaToRgb(decoded.data, decoded.width, decoded.height) };
}
