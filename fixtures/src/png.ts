import { deflateSync, inflateSync } from "node:zlib";
import { concatPng, crc32, u32be } from "./container.js";

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);

function chunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const typeBytes = new TextEncoder().encode(type);
  const body = new Uint8Array(typeBytes.byteLength + data.byteLength);
  body.set(typeBytes);
  body.set(data, typeBytes.byteLength);
  return concatPng(u32be(data.byteLength), typeBytes, data, u32be(crc32(body)));
}

export function encodePng(rgb: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, width);
  new DataView(ihdr.buffer).setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const rows = new Uint8Array(height * (1 + width * 3));
  for (let y = 0; y < height; y += 1) {
    const dest = y * (1 + width * 3);
    rows[dest] = 0;
    rows.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), dest + 1);
  }
  return concatPng(
    PNG_SIGNATURE,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(rows, { level: 6 })),
    chunk("IEND", new Uint8Array())
  );
}

export function decodePng(bytes: Uint8Array): { width: number; height: number; rgb: Uint8Array<ArrayBuffer> } {
  if (bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) throw new Error("Malformed PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat: Uint8Array[] = [];
  while (offset + 12 <= bytes.byteLength) {
    const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset);
    const type = new TextDecoder().decode(bytes.subarray(offset + 4, offset + 8));
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") {
      width = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(0);
      height = new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(4);
      if (data[8] !== 8 || data[9] !== 2) throw new Error("Unsupported PNG color type");
    }
    if (type === "IDAT") idat.push(data);
    offset += 12 + length;
    if (type === "IEND") break;
  }
  const inflated = inflateSync(concatPng(...idat));
  const rgb = new Uint8Array(width * height * 3);
  const stride = 1 + width * 3;
  for (let y = 0; y < height; y += 1) {
    if (inflated[y * stride] !== 0) throw new Error("Unsupported PNG filter");
    rgb.set(inflated.subarray(y * stride + 1, y * stride + stride), y * width * 3);
  }
  return { width, height, rgb };
}
