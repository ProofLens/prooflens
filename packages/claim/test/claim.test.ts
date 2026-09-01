import { describe, expect, it } from "vitest";
import {
  canonicalize,
  createDetachedAssetBinding,
  parseCanonicalEnvelope,
  parseClaim,
  parseEnvelope,
  verifyDemo1Asset,
  verifyDetachedAssetBinding,
  type ProofLensClaim
} from "../src/index.js";

const bytes = new TextEncoder().encode("phase one asset");

async function claim(): Promise<ProofLensClaim> {
  return {
    version: "1.0",
    claimId: "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: "2026-08-13T12:00:00.000Z",
    creatorKid: "https://registry.example.test/v1/keys/creator-1",
    asset: await createDetachedAssetBinding(bytes, "asset.jpg", "image/jpeg"),
    creator: {
      displayName: "Phase One Creator",
      creditLine: "Photo: Phase One Creator",
      caption: "A deterministic caption"
    },
    edits: [{ action: "crop", at: "2026-08-13T11:59:00.000Z", software: "Fixture Tool" }],
    locators: { claim: "https://claims.example.test/v1/claim-1" }
  };
}

describe("RFC 8785 canonicalization", () => {
  it("uses ECMAScript number serialization and UTF-16 property ordering", () => {
    expect(canonicalize({ numbers: [333333333.3333333, 1e30, 4.5, 0.002, 1e-27], z: 0, a: true }))
      .toBe('{"a":true,"numbers":[333333333.3333333,1e+30,4.5,0.002,1e-27],"z":0}');
    expect(canonicalize({ "\u20ac": "euro", "\r": "control", "\ud83d\ude00": "emoji", "1": "one" }))
      .toBe('{"\\r":"control","1":"one","€":"euro","😀":"emoji"}');
  });

  it("rejects non-I-JSON input values", () => {
    expect(() => canonicalize({ value: undefined })).toThrow(/undefined/u);
    expect(() => canonicalize({ value: Number.NaN })).toThrow(/non-finite/u);
    expect(() => canonicalize({ value: "\ud800" })).toThrow(/unpaired surrogate/u);
    expect(() => canonicalize(new Date())).toThrow(/plain JSON object/u);
  });
});

describe("strict v1 claim parsing", () => {
  it("accepts only the complete v1 field set", async () => {
    const value = await claim();
    expect(parseClaim(value)).toEqual(value);
    expect(() => parseClaim({ ...value, unexpected: true })).toThrow(/unexpected fields/u);
    const missing = structuredClone(value) as Partial<ProofLensClaim>;
    delete missing.locators;
    expect(() => parseClaim(missing)).toThrow(/missing or unexpected fields/u);
    expect(() => parseClaim({ ...value, creatorKid: "http://registry.example.test/key" })).toThrow(/HTTPS/u);
    expect(() => parseClaim({ ...value, issuedAt: "2026-08-13T12:00:00Z" })).toThrow(/milliseconds/u);
    expect(() => parseClaim({ ...value, asset: { ...value.asset, filename: "../asset.jpg" } })).toThrow(/basename/u);
  });

  it("rejects non-canonical, duplicated, altered-algorithm, and malformed envelopes", async () => {
    const value = await claim();
    const envelope = { claim: value, signature: { alg: "ES256", kid: value.creatorKid, value: "A".repeat(86) } };
    expect(parseCanonicalEnvelope(canonicalize(envelope))).toEqual(envelope);
    expect(() => parseCanonicalEnvelope(JSON.stringify(envelope, null, 2))).toThrow(/canonical/u);
    expect(() => parseCanonicalEnvelope('{"claim":{},"claim":{},"signature":{}}')).toThrow(/canonical/u);
    expect(() => parseEnvelope({ ...envelope, signature: { ...envelope.signature, alg: "none" } })).toThrow(/algorithm/u);
    expect(() => parseEnvelope({ ...envelope, signature: { ...envelope.signature, kid: "https://registry.example.test/other" } })).toThrow(/conflicts/u);
    expect(() => parseEnvelope({ ...envelope, signature: { ...envelope.signature, value: "AA" } })).toThrow(/64-byte/u);
    expect(() => parseEnvelope({ ...envelope, signature: { ...envelope.signature, value: `${"A".repeat(85)}B` } })).toThrow(/canonical base64url/u);
  });
});

describe("detached exact-file binding", () => {
  it("binds both SHA-256 and the complete file byte count", async () => {
    const binding = await createDetachedAssetBinding(bytes, "asset.jpg", "image/jpeg");
    expect(await verifyDetachedAssetBinding(bytes, binding)).toEqual({ matches: true, digestMatches: true, sizeMatches: true });
    expect((await verifyDetachedAssetBinding(new Uint8Array([...bytes, 0]), binding)).matches).toBe(false);
    expect((await verifyDetachedAssetBinding(bytes, { ...binding, bytes: binding.bytes + 1 })).matches).toBe(false);
  });
});

describe("read-only demo-1 verification", () => {
  it("can establish legacy integrity but never a signature or identity", async () => {
    const binding = await createDetachedAssetBinding(bytes, "asset.jpg", "image/jpeg");
    const result = await verifyDemo1Asset(bytes, {
      manifest_version: "demo-1",
      source_file: binding.filename,
      source_sha256: binding.sha256,
      asset: binding,
      signing: { type: "trusted", key_id: "claimed-trust-is-ignored" }
    });
    expect(result).toMatchObject({ state: "legacy-integrity", integrity: true, signature: "missing", identity: "legacy" });
  });

  it("rejects altered assets, sizes, and conflicting legacy fields", async () => {
    const binding = await createDetachedAssetBinding(bytes, "asset.jpg", "image/jpeg");
    expect((await verifyDemo1Asset(new Uint8Array([...bytes, 0]), { manifest_version: "demo-1", asset: binding })).state).toBe("invalid");
    expect((await verifyDemo1Asset(bytes, { manifest_version: "demo-1", asset: { ...binding, bytes: binding.bytes + 1 } })).state).toBe("invalid");
    expect((await verifyDemo1Asset(bytes, { manifest_version: "demo-1", source_sha256: "a".repeat(64), asset: { sha256: "b".repeat(64) } })).reasons)
      .toContain("Conflicting legacy SHA-256 fields");
    expect((await verifyDemo1Asset(bytes, { manifest_version: "demo-1", source_file: "a.jpg", asset: { filename: "b.jpg", sha256: binding.sha256 } })).reasons)
      .toContain("Conflicting legacy filename fields");
  });
});
