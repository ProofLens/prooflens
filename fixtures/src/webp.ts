import { BitReader, BitWriter, canonicalCodes, reverseBits } from "./bits.js";
import { concatPng, u32le } from "./container.js";

const CODE_LENGTH_ORDER = [17, 18, 0, 1, 2, 3, 4, 5, 16, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

function writeHuffman(writer: BitWriter, codes: number[], lengths: number[], symbol: number): void {
  const length = lengths[symbol] ?? 0;
  if (length === 0) throw new Error(`Huffman symbol ${symbol} is unused`);
  writer.writeBits(length, reverseBits(codes[symbol] ?? 0, length));
}

function writeSimpleDistanceTree(writer: BitWriter): void {
  writer.writeBits(1, 1);
  writer.writeBits(1, 0);
  writer.writeBits(1, 0);
  writer.writeBits(1, 0);
}

function writeUniformByteTree(writer: BitWriter, alphabetSize: number): void {
  const lengths = new Array<number>(alphabetSize).fill(0);
  for (let symbol = 0; symbol < 256; symbol += 1) lengths[symbol] = 8;
  writer.writeBits(1, 0);
  writer.writeBits(4, 8);
  const lengthCodeLengths = new Array<number>(19).fill(0);
  lengthCodeLengths[8] = 2;
  lengthCodeLengths[16] = 2;
  lengthCodeLengths[17] = 2;
  lengthCodeLengths[18] = 2;
  for (let index = 0; index < 12; index += 1) writer.writeBits(3, lengthCodeLengths[CODE_LENGTH_ORDER[index] ?? 0] ?? 0);
  writer.writeBits(1, 0);
  const encoded = canonicalCodes(lengthCodeLengths);
  writeHuffman(writer, encoded.codes, lengthCodeLengths, 8);
  for (let repeat = 0; repeat < 42; repeat += 1) {
    writeHuffman(writer, encoded.codes, lengthCodeLengths, 16);
    writer.writeBits(2, 3);
  }
  writeHuffman(writer, encoded.codes, lengthCodeLengths, 16);
  writer.writeBits(2, 0);
  if (alphabetSize > 256) {
    writeHuffman(writer, encoded.codes, lengthCodeLengths, 18);
    writer.writeBits(7, alphabetSize - 256 - 11);
  }
}

function readHuffman(reader: BitReader, lengths: number[]): number {
  const { codes, maxLength } = canonicalCodes(lengths);
  let value = 0;
  for (let length = 1; length <= maxLength; length += 1) {
    value = (value << 1) | reader.readBits(1);
    const symbol = lengths.findIndex((codeLength, index) => codeLength === length && codes[index] === value);
    if (symbol >= 0) return symbol;
  }
  throw new Error("Invalid Huffman symbol");
}

function readSimpleTree(reader: BitReader, alphabetSize: number): number[] {
  const lengths = new Array<number>(alphabetSize).fill(0);
  const numSymbols = reader.readBits(1) + 1;
  const first8 = reader.readBits(1);
  const symbol0 = reader.readBits(1 + 7 * first8);
  lengths[symbol0] = 1;
  if (numSymbols === 2) lengths[reader.readBits(8)] = 1;
  return lengths;
}

function readNormalTree(reader: BitReader, alphabetSize: number): number[] {
  if (reader.readBits(1) !== 0) return readSimpleTree(reader, alphabetSize);
  const numCodeLengths = 4 + reader.readBits(4);
  const lengthCodeLengths = new Array<number>(19).fill(0);
  for (let index = 0; index < numCodeLengths; index += 1) {
    lengthCodeLengths[CODE_LENGTH_ORDER[index] ?? 0] = reader.readBits(3);
  }
  const maxSymbol = reader.readBits(1) === 0 ? alphabetSize : 2 + reader.readBits(2 + 2 * reader.readBits(3));
  const lengths = new Array<number>(alphabetSize).fill(0);
  let filled = 0;
  let previous = 8;
  while (filled < maxSymbol) {
    const symbol = readHuffman(reader, lengthCodeLengths);
    if (symbol < 16) {
      lengths[filled] = symbol;
      if (symbol !== 0) previous = symbol;
      filled += 1;
    } else if (symbol === 16) {
      const repeat = 3 + reader.readBits(2);
      for (let index = 0; index < repeat && filled < maxSymbol; index += 1) {
        lengths[filled] = previous;
        filled += 1;
      }
    } else {
      const repeat = symbol === 17 ? 3 + reader.readBits(3) : 11 + reader.readBits(7);
      filled += repeat;
    }
  }
  return lengths;
}

export function encodeLosslessWebp(rgb: Uint8Array, width: number, height: number): Uint8Array<ArrayBuffer> {
  const writer = new BitWriter();
  writer.writeBits(8, 0x2f);
  writer.writeBits(14, width - 1);
  writer.writeBits(14, height - 1);
  writer.writeBits(1, 0);
  writer.writeBits(3, 0);
  writer.writeBits(1, 0);
  writer.writeBits(1, 0);
  writer.writeBits(1, 0);
  writeUniformByteTree(writer, 280);
  writeUniformByteTree(writer, 256);
  writeUniformByteTree(writer, 256);
  writeUniformByteTree(writer, 256);
  writeSimpleDistanceTree(writer);
  const byteTree = canonicalCodes(new Array<number>(256).fill(8));
  for (let index = 0; index < rgb.byteLength; index += 3) {
    writeHuffman(writer, byteTree.codes, new Array<number>(256).fill(8), rgb[index + 1] ?? 0);
    writeHuffman(writer, byteTree.codes, new Array<number>(256).fill(8), rgb[index] ?? 0);
    writeHuffman(writer, byteTree.codes, new Array<number>(256).fill(8), rgb[index + 2] ?? 0);
    writeHuffman(writer, byteTree.codes, new Array<number>(256).fill(8), 255);
  }
  const payload = writer.finish();
  const chunk = concatPng(new TextEncoder().encode("VP8L"), u32le(payload.byteLength), payload, payload.byteLength % 2 === 0 ? new Uint8Array() : Uint8Array.of(0));
  const body = concatPng(new TextEncoder().encode("WEBP"), chunk);
  return concatPng(new TextEncoder().encode("RIFF"), u32le(body.byteLength), body);
}

export function decodeLosslessWebp(bytes: Uint8Array): { width: number; height: number; rgb: Uint8Array<ArrayBuffer> } {
  if (new TextDecoder().decode(bytes.subarray(0, 4)) !== "RIFF" || new TextDecoder().decode(bytes.subarray(8, 12)) !== "WEBP") {
    throw new Error("Malformed WebP");
  }
  let offset = 12;
  let payload: Uint8Array | undefined;
  while (offset + 8 <= bytes.byteLength) {
    const type = new TextDecoder().decode(bytes.subarray(offset, offset + 4));
    const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(offset + 4, true);
    if (type === "VP8L") payload = bytes.subarray(offset + 8, offset + 8 + length);
    offset += 8 + length + (length % 2);
  }
  if (payload === undefined) throw new Error("Malformed WebP: missing VP8L");
  const reader = new BitReader(payload);
  if (reader.readBits(8) !== 0x2f) throw new Error("Malformed VP8L signature");
  const width = reader.readBits(14) + 1;
  const height = reader.readBits(14) + 1;
  reader.readBits(1);
  if (reader.readBits(3) !== 0) throw new Error("Unsupported VP8L version");
  if (reader.readBits(1) !== 0) throw new Error("Unsupported VP8L transform");
  if (reader.readBits(1) !== 0) throw new Error("Unsupported VP8L color cache");
  if (reader.readBits(1) !== 0) throw new Error("Unsupported VP8L meta prefix");
  const green = readNormalTree(reader, 280);
  const red = readNormalTree(reader, 256);
  const blue = readNormalTree(reader, 256);
  const alpha = readNormalTree(reader, 256);
  readNormalTree(reader, 40);
  const rgb = new Uint8Array(width * height * 3);
  for (let index = 0; index < rgb.byteLength; index += 3) {
    rgb[index + 1] = readHuffman(reader, green);
    rgb[index] = readHuffman(reader, red);
    rgb[index + 2] = readHuffman(reader, blue);
    readHuffman(reader, alpha);
  }
  return { width, height, rgb };
}
