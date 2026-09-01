const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder();

export function utf8Bytes(value: string): Uint8Array<ArrayBuffer> {
  return new Uint8Array(utf8Encoder.encode(value));
}

export function decodeUtf8(bytes: Uint8Array): string {
  return utf8Decoder.decode(bytes);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const output = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

export function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export function equalAt(bytes: Uint8Array, expected: Uint8Array, offset: number): boolean {
  if (offset < 0 || offset + expected.byteLength > bytes.byteLength) return false;
  return expected.every((byte, index) => bytes[offset + index] === byte);
}

export function ascii(bytes: Uint8Array, start: number, end: number): string {
  return decodeUtf8(bytes.subarray(start, end));
}

export function u32(value: number, littleEndian: boolean): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  view(bytes).setUint32(0, value, littleEndian);
  return bytes;
}

export function u24le(value: number): Uint8Array<ArrayBuffer> {
  return Uint8Array.of(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff);
}

export function readU24le(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0) | ((bytes[offset + 1] ?? 0) << 8) | ((bytes[offset + 2] ?? 0) << 16);
}

export function cloneBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
