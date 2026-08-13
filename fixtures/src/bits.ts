export class BitWriter {
  private readonly bytes: number[] = [];
  private value = 0;
  private filled = 0;

  writeBits(count: number, bits: number): void {
    let remaining = count;
    let data = bits;
    while (remaining > 0) {
      const take = Math.min(8 - this.filled, remaining);
      this.value |= (data & ((1 << take) - 1)) << this.filled;
      this.filled += take;
      data >>>= take;
      remaining -= take;
      if (this.filled === 8) {
        this.bytes.push(this.value);
        this.value = 0;
        this.filled = 0;
      }
    }
  }

  finish(): Uint8Array<ArrayBuffer> {
    if (this.filled > 0) this.bytes.push(this.value);
    return Uint8Array.from(this.bytes);
  }
}

export class BitReader {
  private index = 0;
  private value = 0;
  private available = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readBits(count: number): number {
    let result = 0;
    let shift = 0;
    let remaining = count;
    while (remaining > 0) {
      if (this.available === 0) {
        if (this.index >= this.bytes.byteLength) throw new Error("Truncated bitstream");
        this.value = this.bytes[this.index] ?? 0;
        this.index += 1;
        this.available = 8;
      }
      const take = Math.min(this.available, remaining);
      result |= (this.value & ((1 << take) - 1)) << shift;
      this.value >>>= take;
      this.available -= take;
      shift += take;
      remaining -= take;
    }
    return result;
  }
}

export function reverseBits(value: number, length: number): number {
  let result = 0;
  let bits = value;
  for (let index = 0; index < length; index += 1) {
    result = (result << 1) | (bits & 1);
    bits >>>= 1;
  }
  return result;
}

export function canonicalCodes(lengths: number[]): { codes: number[]; maxLength: number } {
  const maxLength = lengths.reduce((max, length) => Math.max(max, length), 0);
  const blCount = new Array<number>(maxLength + 1).fill(0);
  for (const length of lengths) if (length > 0) blCount[length] = (blCount[length] ?? 0) + 1;
  const nextCode = new Array<number>(maxLength + 1).fill(0);
  let code = 0;
  for (let bits = 1; bits <= maxLength; bits += 1) {
    code = (code + (blCount[bits - 1] ?? 0)) << 1;
    nextCode[bits] = code;
  }
  const codes = lengths.map((length) => {
    if (length === 0) return 0;
    const assigned = nextCode[length] ?? 0;
    nextCode[length] = assigned + 1;
    return assigned;
  });
  return { codes, maxLength };
}
