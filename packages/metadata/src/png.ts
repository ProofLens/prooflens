import { concatBytes, crc32, equalAt, utf8Bytes, view } from "./bytes.js";

const PNG_SIGNATURE = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
const PNG_XMP_PREFIX = utf8Bytes("XML:com.adobe.xmp\0\0\0\0\0");

export interface PngChunk {
  type: string;
  data: Uint8Array;
  raw: Uint8Array;
}

export function parsePng(source: Uint8Array): PngChunk[] {
  if (!equalAt(source, PNG_SIGNATURE, 0)) throw new Error("Malformed PNG");
  const chunks: PngChunk[] = [];
  let offset = 8;
  const data = view(source);
  let sawHeader = false;
  let sawEnd = false;
  while (offset + 12 <= source.byteLength) {
    const length = data.getUint32(offset);
    const end = offset + 12 + length;
    if (end > source.byteLength) throw new Error("Malformed PNG chunk");
    const type = new TextDecoder().decode(source.subarray(offset + 4, offset + 8));
    const payload = source.subarray(offset + 8, offset + 8 + length);
    const expectedCrc = data.getUint32(offset + 8 + length);
    const actualCrc = crc32(source.subarray(offset + 4, offset + 8 + length));
    if (expectedCrc !== actualCrc) throw new Error(`Malformed PNG CRC for ${type}`);
    chunks.push({ type, data: payload, raw: source.subarray(offset, end) });
    offset = end;
    if (type === "IHDR") sawHeader = true;
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }
  if (!sawHeader || !sawEnd) throw new Error("Malformed PNG: missing IHDR or IEND");
  return chunks;
}

export function serializePng(chunks: PngChunk[]): Uint8Array<ArrayBuffer> {
  return concatBytes(PNG_SIGNATURE, ...chunks.map((chunk) => chunk.raw));
}

function pngChunk(type: string, data: Uint8Array): PngChunk {
  const typeBytes = utf8Bytes(type);
  const raw = concatBytes(viewU32(data.byteLength), typeBytes, data, viewU32(crc32(concatBytes(typeBytes, data))));
  return { type, data, raw };
}

function viewU32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function isXmp(chunk: PngChunk): boolean {
  return chunk.type === "iTXt" && equalAt(chunk.data, PNG_XMP_PREFIX, 0);
}

export function extractPngXmp(source: Uint8Array): string | undefined {
  const chunk = parsePng(source).find(isXmp);
  return chunk === undefined ? undefined : new TextDecoder().decode(chunk.data.subarray(PNG_XMP_PREFIX.byteLength));
}

export function extractPngText(source: Uint8Array, keyword: string): string | undefined {
  for (const chunk of parsePng(source)) {
    if (chunk.type !== "tEXt") continue;
    const separator = chunk.data.indexOf(0);
    if (separator <= 0) continue;
    if (new TextDecoder().decode(chunk.data.subarray(0, separator)) === keyword) {
      return new TextDecoder().decode(chunk.data.subarray(separator + 1));
    }
  }
  return undefined;
}

export function embedPngText(source: Uint8Array, keyword: string, value: string): Uint8Array<ArrayBuffer> {
  const chunks = parsePng(source);
  const data = concatBytes(utf8Bytes(keyword), Uint8Array.of(0), utf8Bytes(value));
  const text = pngChunk("tEXt", data);
  const output: PngChunk[] = [];
  let inserted = false;
  for (const chunk of chunks) {
    if (chunk.type === "IDAT" && !inserted) {
      output.push(text);
      inserted = true;
    }
    output.push(chunk);
  }
  if (!inserted) throw new Error("Malformed PNG: missing IDAT");
  return serializePng(output);
}

export function embedPngXmp(source: Uint8Array, packet: string): Uint8Array<ArrayBuffer> {
  const chunks = parsePng(source);
  const xmp = pngChunk("iTXt", concatBytes(PNG_XMP_PREFIX, utf8Bytes(packet)));
  const output: PngChunk[] = [];
  let inserted = false;
  for (const chunk of chunks) {
    if (isXmp(chunk)) {
      if (!inserted) {
        output.push(xmp);
        inserted = true;
      }
      continue;
    }
    if (chunk.type === "IDAT" && !inserted) {
      output.push(xmp);
      inserted = true;
    }
    output.push(chunk);
  }
  if (!inserted) throw new Error("Malformed PNG: missing IDAT");
  return serializePng(output);
}

export function stripPngXmp(source: Uint8Array): Uint8Array<ArrayBuffer> {
  return serializePng(parsePng(source).filter((chunk) => !isXmp(chunk)));
}

export function replacePngXmp(source: Uint8Array, packet: string | undefined): Uint8Array<ArrayBuffer> {
  const without = stripPngXmp(source);
  return packet === undefined ? without : embedPngXmp(without, packet);
}
