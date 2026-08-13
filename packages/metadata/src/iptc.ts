import { concatBytes, utf8Bytes, view } from "./bytes.js";
import type { DescriptiveMetadata } from "./types.js";

const UTF8_CODED_CHARACTER_SET = Uint8Array.of(0x1b, 0x25, 0x47);

function dataset(record: number, id: number, data: Uint8Array): Uint8Array<ArrayBuffer> {
  if (data.byteLength >= 0x8000) throw new Error("IPTC dataset is too large");
  return concatBytes(Uint8Array.of(0x1c, record, id, (data.byteLength >>> 8) & 0xff, data.byteLength & 0xff), data);
}

export function encodeIptcIim(descriptive: DescriptiveMetadata): Uint8Array<ArrayBuffer> {
  const parts = [dataset(1, 90, UTF8_CODED_CHARACTER_SET)];
  if (descriptive.creator !== undefined) parts.push(dataset(2, 80, utf8Bytes(descriptive.creator)));
  if (descriptive.credit !== undefined) parts.push(dataset(2, 110, utf8Bytes(descriptive.credit)));
  if (descriptive.description !== undefined) parts.push(dataset(2, 120, utf8Bytes(descriptive.description)));
  return concatBytes(...parts);
}

export function decodeIptcIim(bytes: Uint8Array): DescriptiveMetadata {
  const descriptive: DescriptiveMetadata = {};
  let offset = 0;
  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0x1c) {
      offset += 1;
      continue;
    }
    if (offset + 5 > bytes.byteLength) throw new Error("Malformed IPTC dataset");
    const record = bytes[offset + 1] ?? 0;
    const id = bytes[offset + 2] ?? 0;
    const length = ((bytes[offset + 3] ?? 0) << 8) | (bytes[offset + 4] ?? 0);
    if (length >= 0x8000 || offset + 5 + length > bytes.byteLength) throw new Error("Malformed IPTC dataset length");
    const value = new TextDecoder().decode(bytes.subarray(offset + 5, offset + 5 + length));
    if (record === 2 && id === 80) descriptive.creator = value;
    if (record === 2 && id === 110) descriptive.credit = value;
    if (record === 2 && id === 120) descriptive.description = value;
    offset += 5 + length;
  }
  return descriptive;
}

const IRB_TYPE = utf8Bytes("8BIM");
const PHOTOSHOP_30 = utf8Bytes("Photoshop 3.0\0");
const IPTC_RESOURCE_ID = 0x0404;

export interface PhotoshopResource {
  id: number;
  name: Uint8Array;
  data: Uint8Array;
}

function evenPad(length: number): number {
  return length % 2 === 0 ? 0 : 1;
}

export function parsePhotoshopIrb(payload: Uint8Array): PhotoshopResource[] {
  if (payload.byteLength < PHOTOSHOP_30.byteLength || new TextDecoder().decode(payload.subarray(0, PHOTOSHOP_30.byteLength)) !== "Photoshop 3.0\0") {
    throw new Error("Unsupported Photoshop IRB signature");
  }
  const resources: PhotoshopResource[] = [];
  let offset = PHOTOSHOP_30.byteLength;
  const data = view(payload);
  while (offset + 12 <= payload.byteLength) {
    if (!IRB_TYPE.every((byte, index) => payload[offset + index] === byte)) throw new Error("Malformed Photoshop IRB resource");
    const id = data.getUint16(offset + 4);
    const nameLength = payload[offset + 6] ?? 0;
    const nameStart = offset + 6;
    const nameTotal = 1 + nameLength + evenPad(1 + nameLength);
    const sizeOffset = nameStart + nameTotal;
    if (sizeOffset + 4 > payload.byteLength) throw new Error("Malformed Photoshop IRB name");
    const size = data.getUint32(sizeOffset);
    const dataStart = sizeOffset + 4;
    const dataEnd = dataStart + size;
    if (dataEnd > payload.byteLength) throw new Error("Malformed Photoshop IRB payload");
    resources.push({
      id,
      name: payload.subarray(nameStart, nameStart + nameTotal),
      data: payload.subarray(dataStart, dataEnd)
    });
    offset = dataEnd + evenPad(size);
  }
  return resources;
}

function serializeResource(resource: PhotoshopResource): Uint8Array<ArrayBuffer> {
  const paddedData = evenPad(resource.data.byteLength) === 0
    ? resource.data
    : concatBytes(resource.data, Uint8Array.of(0));
  return concatBytes(IRB_TYPE, Uint8Array.of((resource.id >>> 8) & 0xff, resource.id & 0xff), resource.name, viewU32(resource.data.byteLength), paddedData);
}

function viewU32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

export function serializePhotoshopIrb(resources: PhotoshopResource[]): Uint8Array<ArrayBuffer> {
  return concatBytes(PHOTOSHOP_30, ...resources.map(serializeResource));
}

export function upsertIptcResource(resources: PhotoshopResource[], iptc: Uint8Array): PhotoshopResource[] {
  const resource: PhotoshopResource = { id: IPTC_RESOURCE_ID, name: Uint8Array.of(0, 0), data: iptc };
  const index = resources.findIndex((entry) => entry.id === IPTC_RESOURCE_ID);
  if (index === -1) return [...resources, resource];
  return resources.map((entry, current) => current === index ? resource : entry);
}

export function readIptcFromResources(resources: PhotoshopResource[]): DescriptiveMetadata | undefined {
  const resource = resources.find((entry) => entry.id === IPTC_RESOURCE_ID);
  return resource === undefined ? undefined : decodeIptcIim(resource.data);
}
