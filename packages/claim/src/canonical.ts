function assertUnicodeScalarString(value: string, path: string): void {
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) throw new TypeError(`${path} contains an unpaired surrogate`);
      index += 1;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      throw new TypeError(`${path} contains an unpaired surrogate`);
    }
  }
}

function assertJsonValue(value: unknown, path: string): void {
  if (value === null || typeof value === "boolean") return;
  if (typeof value === "string") {
    assertUnicodeScalarString(value, path);
    return;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number`);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      if (entry === undefined) throw new TypeError(`${path}[${index}] is undefined`);
      assertJsonValue(entry, `${path}[${index}]`);
    });
    return;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} is not a plain JSON object`);
    for (const [key, entry] of Object.entries(value)) {
      assertUnicodeScalarString(key, `${path} key`);
      if (entry === undefined) throw new TypeError(`${path}.${key} is undefined`);
      assertJsonValue(entry, `${path}.${key}`);
    }
    return;
  }
  throw new TypeError(`${path} contains unsupported JSON data`);
}

function serialize(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(serialize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${serialize(record[key])}`)
    .join(",")}}`;
}

/** RFC 8785 JSON Canonicalization Scheme for parsed I-JSON-compatible values. */
export function canonicalize(value: unknown): string {
  assertJsonValue(value, "$");
  return serialize(value);
}

export function parseCanonicalJson(source: string): unknown {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error("Invalid JSON", { cause: error });
  }
  if (canonicalize(value) !== source) throw new Error("JSON is not RFC 8785 canonical form");
  return value;
}
