import { concatBytes, equalAt, utf8Bytes } from "./bytes.js";
import {
  encodeIptcIim,
  parsePhotoshopIrb,
  readIptcFromResources,
  serializePhotoshopIrb,
  upsertIptcResource,
  type PhotoshopResource
} from "./iptc.js";
import type { DescriptiveMetadata } from "./types.js";

const SOI = Uint8Array.of(0xff, 0xd8);
const JPEG_XMP_HEADER = utf8Bytes("http://ns.adobe.com/xap/1.0/\0");
const PHOTOSHOP_30 = utf8Bytes("Photoshop 3.0\0");

export interface JpegSegment {
  marker: number;
  payload: Uint8Array;
}

export interface ParsedJpeg {
  segments: JpegSegment[];
  rest: Uint8Array;
}

function standalone(marker: number): boolean {
  return marker === 0x01 || marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);
}

export function parseJpeg(source: Uint8Array): ParsedJpeg {
  if (!equalAt(source, SOI, 0)) throw new Error("Malformed JPEG");
  const segments: JpegSegment[] = [];
  let offset = 2;
  while (offset < source.byteLength) {
    if (source[offset] !== 0xff) throw new Error("Malformed JPEG marker");
    while (offset < source.byteLength && source[offset] === 0xff) offset += 1;
    if (offset >= source.byteLength) throw new Error("Malformed JPEG marker");
    const marker = source[offset] ?? 0;
    offset += 1;
    if (marker === 0xda) {
      return { segments, rest: source.subarray(offset - 2) };
    }
    if (marker === 0xd9) {
      return { segments, rest: source.subarray(offset - 2) };
    }
    if (standalone(marker)) continue;
    if (offset + 2 > source.byteLength) throw new Error("Malformed JPEG segment");
    const length = ((source[offset] ?? 0) << 8) | (source[offset + 1] ?? 0);
    if (length < 2 || offset + length > source.byteLength) throw new Error("Malformed JPEG segment length");
    segments.push({ marker, payload: source.subarray(offset + 2, offset + length) });
    offset += length;
  }
  throw new Error("Malformed JPEG: missing scan data");
}

function segmentBytes(segment: JpegSegment): Uint8Array<ArrayBuffer> {
  const length = segment.payload.byteLength + 2;
  if (length > 0xffff) throw new Error("JPEG segment is too large");
  return concatBytes(Uint8Array.of(0xff, segment.marker, (length >>> 8) & 0xff, length & 0xff), segment.payload);
}

export function serializeJpeg(parsed: ParsedJpeg): Uint8Array<ArrayBuffer> {
  return concatBytes(SOI, ...parsed.segments.map(segmentBytes), parsed.rest);
}

function isXmp(segment: JpegSegment): boolean {
  return segment.marker === 0xe1 && equalAt(segment.payload, JPEG_XMP_HEADER, 0);
}

function isPhotoshopIrb(segment: JpegSegment): boolean {
  return segment.marker === 0xed && equalAt(segment.payload, PHOTOSHOP_30, 0);
}

export function extractJpegXmp(source: Uint8Array): string | undefined {
  const xmp = parseJpeg(source).segments.find(isXmp);
  return xmp === undefined ? undefined : new TextDecoder().decode(xmp.payload.subarray(JPEG_XMP_HEADER.byteLength));
}

export function extractJpegIptc(source: Uint8Array): DescriptiveMetadata | undefined {
  const irb = parseJpeg(source).segments.find(isPhotoshopIrb);
  if (irb === undefined) return undefined;
  return readIptcFromResources(parsePhotoshopIrb(irb.payload));
}

export function preserveJpegComment(source: Uint8Array): string | undefined {
  const comment = parseJpeg(source).segments.find((segment) => segment.marker === 0xfe);
  return comment === undefined ? undefined : new TextDecoder().decode(comment.payload);
}

function insertAfterExistingMetadata(segments: JpegSegment[], segment: JpegSegment, match: (value: JpegSegment) => boolean): JpegSegment[] {
  const index = segments.findIndex(match);
  if (index >= 0) return segments.map((entry, current) => current === index ? segment : entry);
  let insertAt = 0;
  while (insertAt < segments.length) {
    const marker = segments[insertAt]?.marker ?? 0;
    if (marker === 0xe0 || marker === 0xe1) insertAt += 1;
    else break;
  }
  return [...segments.slice(0, insertAt), segment, ...segments.slice(insertAt)];
}

export function embedJpegXmp(source: Uint8Array, packet: string): Uint8Array<ArrayBuffer> {
  const parsed = parseJpeg(source);
  const payload = concatBytes(JPEG_XMP_HEADER, utf8Bytes(packet));
  if (payload.byteLength + 2 > 0xffff) throw new Error("XMP packet is too large for JPEG APP1");
  return serializeJpeg({ ...parsed, segments: insertAfterExistingMetadata(parsed.segments, { marker: 0xe1, payload }, isXmp) });
}

export function embedJpegIptc(source: Uint8Array, descriptive: DescriptiveMetadata): Uint8Array<ArrayBuffer> {
  const parsed = parseJpeg(source);
  const existing = parsed.segments.find(isPhotoshopIrb);
  const resources: PhotoshopResource[] = existing === undefined ? [] : parsePhotoshopIrb(existing.payload);
  const payload = serializePhotoshopIrb(upsertIptcResource(resources, encodeIptcIim(descriptive)));
  if (payload.byteLength + 2 > 0xffff) throw new Error("IPTC payload is too large for JPEG APP13");
  const segments = insertAfterExistingMetadata(parsed.segments, { marker: 0xed, payload }, isPhotoshopIrb);
  return serializeJpeg({ ...parsed, segments });
}

export function stripJpegXmp(source: Uint8Array): Uint8Array<ArrayBuffer> {
  const parsed = parseJpeg(source);
  return serializeJpeg({ ...parsed, segments: parsed.segments.filter((segment) => !isXmp(segment)) });
}

export function replaceJpegXmp(source: Uint8Array, packet: string | undefined): Uint8Array<ArrayBuffer> {
  const without = stripJpegXmp(source);
  return packet === undefined ? without : embedJpegXmp(without, packet);
}

export function embedJpegComment(source: Uint8Array, value: string): Uint8Array<ArrayBuffer> {
  const parsed = parseJpeg(source);
  return serializeJpeg({
    ...parsed,
    segments: [...parsed.segments, { marker: 0xfe, payload: utf8Bytes(value) }]
  });
}
