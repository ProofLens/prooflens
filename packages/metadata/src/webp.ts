import { ascii, concatBytes, equalAt, readU24le, u24le, u32, utf8Bytes, view } from "./bytes.js";

const RIFF = utf8Bytes("RIFF");
const WEBP = utf8Bytes("WEBP");
const VP8X_FLAG_ICC = 0x20;
const VP8X_FLAG_ALPHA = 0x10;
const VP8X_FLAG_EXIF = 0x08;
const VP8X_FLAG_XMP = 0x04;
const VP8X_FLAG_ANIM = 0x02;

export interface WebpChunk {
  type: string;
  payload: Uint8Array;
}

export function parseWebp(source: Uint8Array): WebpChunk[] {
  if (!equalAt(source, RIFF, 0) || !equalAt(source, WEBP, 8)) throw new Error("Malformed WebP");
  const declared = view(source).getUint32(4, true);
  if (declared + 8 > source.byteLength) throw new Error("Malformed WebP RIFF size");
  const limit = 8 + declared;
  const chunks: WebpChunk[] = [];
  let offset = 12;
  while (offset + 8 <= limit) {
    const type = ascii(source, offset, offset + 4);
    const length = view(source).getUint32(offset + 4, true);
    const payloadEnd = offset + 8 + length;
    if (payloadEnd > limit) throw new Error("Malformed WebP chunk");
    chunks.push({ type, payload: source.subarray(offset + 8, payloadEnd) });
    offset = payloadEnd + (length % 2);
  }
  if (chunks.some((chunk) => chunk.type === "ANIM" || chunk.type === "ANMF")) {
    throw new Error("Unsupported animated WebP");
  }
  if (!chunks.some((chunk) => chunk.type === "VP8 " || chunk.type === "VP8L")) {
    throw new Error("Malformed WebP: missing image bitstream");
  }
  return chunks;
}

function serializeChunk(chunk: WebpChunk): Uint8Array<ArrayBuffer> {
  const pad = chunk.payload.byteLength % 2 === 0 ? new Uint8Array() : Uint8Array.of(0);
  return concatBytes(utf8Bytes(chunk.type), u32(chunk.payload.byteLength, true), chunk.payload, pad);
}

export function serializeWebp(chunks: WebpChunk[]): Uint8Array<ArrayBuffer> {
  const body = concatBytes(WEBP, ...chunks.map(serializeChunk));
  return concatBytes(RIFF, u32(body.byteLength, true), body);
}

function readVp8Dimensions(payload: Uint8Array): { width: number; height: number; alpha: boolean } {
  if (payload.byteLength < 10 || payload[3] !== 0x9d || payload[4] !== 0x01 || payload[5] !== 0x2a) {
    throw new Error("Malformed VP8 bitstream");
  }
  const width = view(payload).getUint16(6, true) & 0x3fff;
  const height = view(payload).getUint16(8, true) & 0x3fff;
  return { width, height, alpha: false };
}

function readVp8lDimensions(payload: Uint8Array): { width: number; height: number; alpha: boolean } {
  if (payload.byteLength < 5 || payload[0] !== 0x2f) throw new Error("Malformed VP8L bitstream");
  const bits = payload[1]! | (payload[2]! << 8) | (payload[3]! << 16) | (payload[4]! << 24);
  return {
    width: (bits & 0x3fff) + 1,
    height: ((bits >>> 14) & 0x3fff) + 1,
    alpha: ((bits >>> 28) & 1) === 1
  };
}

function canvasSize(chunks: WebpChunk[]): { width: number; height: number; alpha: boolean } {
  const vp8x = chunks.find((chunk) => chunk.type === "VP8X");
  if (vp8x !== undefined) {
    if (vp8x.payload.byteLength < 10) throw new Error("Malformed VP8X chunk");
    return {
      width: readU24le(vp8x.payload, 4) + 1,
      height: readU24le(vp8x.payload, 7) + 1,
      alpha: ((vp8x.payload[0] ?? 0) & VP8X_FLAG_ALPHA) !== 0
    };
  }
  const vp8l = chunks.find((chunk) => chunk.type === "VP8L");
  if (vp8l !== undefined) return readVp8lDimensions(vp8l.payload);
  const vp8 = chunks.find((chunk) => chunk.type === "VP8 ");
  if (vp8 !== undefined) return readVp8Dimensions(vp8.payload);
  throw new Error("Malformed WebP: missing image bitstream");
}

function flagsFor(chunks: WebpChunk[], alpha: boolean): number {
  let flags = 0;
  if (chunks.some((chunk) => chunk.type === "ICCP")) flags |= VP8X_FLAG_ICC;
  if (alpha || chunks.some((chunk) => chunk.type === "ALPH")) flags |= VP8X_FLAG_ALPHA;
  if (chunks.some((chunk) => chunk.type === "EXIF")) flags |= VP8X_FLAG_EXIF;
  if (chunks.some((chunk) => chunk.type === "XMP ")) flags |= VP8X_FLAG_XMP;
  if (chunks.some((chunk) => chunk.type === "ANIM" || chunk.type === "ANMF")) flags |= VP8X_FLAG_ANIM;
  return flags;
}

function vp8xChunk(flags: number, width: number, height: number): WebpChunk {
  return {
    type: "VP8X",
    payload: concatBytes(Uint8Array.of(flags, 0, 0, 0), u24le(width - 1), u24le(height - 1))
  };
}

function needsExtended(flags: number): boolean {
  return flags !== 0;
}

function withExtendedHeader(chunks: WebpChunk[]): WebpChunk[] {
  const withoutHeader = chunks.filter((chunk) => chunk.type !== "VP8X");
  const size = canvasSize(chunks);
  const flags = flagsFor(withoutHeader, size.alpha);
  if (!needsExtended(flags)) return withoutHeader;
  return [vp8xChunk(flags, size.width, size.height), ...withoutHeader];
}

export function extractWebpXmp(source: Uint8Array): string | undefined {
  const xmp = parseWebp(source).find((chunk) => chunk.type === "XMP ");
  return xmp === undefined ? undefined : new TextDecoder().decode(xmp.payload);
}

export function extractWebpChunk(source: Uint8Array, type: string): Uint8Array | undefined {
  return parseWebp(source).find((chunk) => chunk.type === type)?.payload;
}

export function embedWebpChunk(source: Uint8Array, type: string, payload: Uint8Array): Uint8Array<ArrayBuffer> {
  const chunks = parseWebp(source).filter((chunk) => chunk.type !== type);
  const imageIndex = chunks.findIndex((chunk) => chunk.type === "VP8 " || chunk.type === "VP8L");
  const insertAt = imageIndex >= 0 ? imageIndex + 1 : chunks.length;
  chunks.splice(insertAt, 0, { type, payload });
  return serializeWebp(withExtendedHeader(chunks));
}

export function embedWebpXmp(source: Uint8Array, packet: string): Uint8Array<ArrayBuffer> {
  return embedWebpChunk(source, "XMP ", utf8Bytes(packet));
}

export function stripWebpXmp(source: Uint8Array): Uint8Array<ArrayBuffer> {
  return serializeWebp(withExtendedHeader(parseWebp(source).filter((chunk) => chunk.type !== "XMP ")));
}

export function replaceWebpXmp(source: Uint8Array, packet: string | undefined): Uint8Array<ArrayBuffer> {
  const without = stripWebpXmp(source);
  return packet === undefined ? without : embedWebpXmp(without, packet);
}
