import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  base64UrlToBytes,
  bytesToBase64Url,
  canonicalize,
  createDetachedAssetBinding,
  parseEnvelope,
  type ProofLensClaim,
  type ProofLensEnvelope
} from "@prooflens/claim";
import {
  createBrowserCreatorKey,
  exportRegistryPublicJwk,
  generateCreatorKey,
  generateStoredCreatorKey,
  parseRegistryRecord,
  restoreBrowserCreatorKey,
  signClaim,
  signClaimWithStoredKey,
  verifyCreatorSignature,
  verifySignedAsset,
  type RegistryIdentityRecord
} from "../src/index.js";

const asset = new TextEncoder().encode("phase one signed asset");

async function fixture(): Promise<{
  claim: ProofLensClaim;
  envelope: ProofLensEnvelope;
  keyPair: CryptoKeyPair;
  record: RegistryIdentityRecord;
}> {
  const keyPair = await generateCreatorKey();
  const creatorKid = "https://registry.example.test/v1/keys/creator-1";
  const claim: ProofLensClaim = {
    version: "1.0",
    claimId: "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: "2026-08-13T12:00:00.000Z",
    creatorKid,
    asset: await createDetachedAssetBinding(asset, "asset.jpg", "image/jpeg"),
    creator: { displayName: "Creator One", creditLine: "Photo: Creator One", caption: "Original caption" },
    edits: [],
    locators: {}
  };
  const record: RegistryIdentityRecord = {
    version: "1.0",
    kid: creatorKid,
    publicKey: await exportRegistryPublicJwk(keyPair.publicKey),
    identity: { displayName: "Creator One", reviewedAt: "2026-08-12T12:00:00.000Z" },
    status: "trusted",
    validFrom: "2026-08-13T00:00:00.000Z",
    validUntil: "2027-08-13T00:00:00.000Z",
    revocation: null
  };
  return { claim, envelope: await signClaim(claim, keyPair.privateKey), keyPair, record };
}

describe("creator ES256", () => {
  it("creates a non-extractable working key and a strict public registry JWK", async () => {
    const keyPair = await generateCreatorKey();
    expect(keyPair.privateKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("pkcs8", keyPair.privateKey)).rejects.toThrow();
    expect(await exportRegistryPublicJwk(keyPair.publicKey)).toMatchObject({
      kty: "EC", crv: "P-256", alg: "ES256", use: "sig", key_ops: ["verify"], ext: true
    });
  });

  it("signs the canonical claim and verifies the shared Node/Python vector", async () => {
    const { envelope, keyPair } = await fixture();
    expect(await verifyCreatorSignature(envelope, keyPair.publicKey)).toBe(true);

    const vector = JSON.parse(await readFile(new URL("../../claim/vectors/prooflens-v1-es256.json", import.meta.url), "utf8")) as {
      canonicalClaim: string;
      publicJwk: JsonWebKey;
      envelope: unknown;
    };
    const publicKey = await crypto.subtle.importKey("jwk", vector.publicJwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    expect(canonicalize(parseEnvelope(vector.envelope).claim)).toBe(vector.canonicalClaim);
    expect(await verifyCreatorSignature(vector.envelope, publicKey)).toBe(true);
  });

  it("rejects altered captions, claims, algorithms, fields, signatures, and keys", async () => {
    const { envelope, keyPair, record } = await fixture();
    const caption = structuredClone(envelope);
    caption.claim.creator.caption = "Altered caption";
    expect((await verifySignedAsset(asset, caption, record, new Date("2026-08-13T12:01:00.000Z"))).state).toBe("invalid");

    const claimId = structuredClone(envelope);
    claimId.claim.claimId = "urn:uuid:7f9619ff-8b86-4e7f-bf84-6f3dd629e11a";
    expect((await verifySignedAsset(asset, claimId, record, new Date("2026-08-13T12:01:00.000Z"))).state).toBe("invalid");

    expect((await verifySignedAsset(asset, { ...envelope, signature: { ...envelope.signature, alg: "RS256" } }, record)).reasons[0])
      .toMatch(/algorithm/u);
    expect((await verifySignedAsset(asset, { ...envelope, unexpected: true }, record)).reasons[0]).toMatch(/unexpected fields/u);

    const signature = structuredClone(envelope);
    signature.signature.value = `${signature.signature.value.startsWith("A") ? "B" : "A"}${signature.signature.value.slice(1)}`;
    expect((await verifySignedAsset(asset, signature, record, new Date("2026-08-13T12:01:00.000Z"))).signature).toBe("invalid");

    const otherKey = await generateCreatorKey();
    const wrongKey = { ...record, publicKey: await exportRegistryPublicJwk(otherKey.publicKey) };
    expect((await verifySignedAsset(asset, envelope, wrongKey, new Date("2026-08-13T12:01:00.000Z"))).signature).toBe("invalid");
    expect(keyPair.privateKey.usages).toEqual(["sign"]);
  });

  it("rejects the high-S malleation of an otherwise valid signature", async () => {
    const { envelope, record } = await fixture();
    const order = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
    const raw = base64UrlToBytes(envelope.signature.value);
    const s = BigInt(`0x${Array.from(raw.subarray(32), (byte) => byte.toString(16).padStart(2, "0")).join("")}`);
    const highS = (order - s).toString(16).padStart(64, "0");
    raw.set(Uint8Array.from(highS.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16)), 32);
    const malleated = structuredClone(envelope);
    malleated.signature.value = bytesToBase64Url(raw);
    expect((await verifySignedAsset(asset, malleated, record, new Date("2026-08-13T12:01:00.000Z"))).signature).toBe("invalid");
  });
});

describe("strict registry and trust semantics", () => {
  it("returns trusted only when every independent check passes", async () => {
    const { envelope, record } = await fixture();
    expect(await verifySignedAsset(asset, envelope, record, new Date("2026-08-13T12:01:00.000Z"))).toMatchObject({
      state: "trusted", integrity: true, signature: "valid", identity: "trusted"
    });
    expect((await verifySignedAsset(new Uint8Array([...asset, 0]), envelope, record, new Date("2026-08-13T12:01:00.000Z"))).state).toBe("invalid");
  });

  it("separates pending, revoked, and expired identities", async () => {
    const { envelope, record } = await fixture();
    const pending = {
      ...record,
      identity: { ...record.identity, reviewedAt: null },
      status: "pending",
      revocation: null
    };
    expect((await verifySignedAsset(asset, envelope, pending, new Date("2026-08-13T12:01:00.000Z"))).state).toBe("valid-untrusted");
    const revoked = {
      ...record,
      status: "revoked",
      revocation: { revokedAt: "2026-08-13T12:00:30.000Z", reason: "Creator-requested revocation" }
    };
    expect((await verifySignedAsset(asset, envelope, revoked, new Date("2026-08-13T12:01:00.000Z"))).state).toBe("revoked");
    expect((await verifySignedAsset(asset, envelope, { ...record, status: "expired" }, new Date("2026-08-13T12:01:00.000Z"))).state).toBe("expired");
    expect((await verifySignedAsset(asset, envelope, record, new Date("2027-08-13T00:00:00.000Z"))).state).toBe("expired");
    expect((await verifySignedAsset(asset, envelope, { ...record, validFrom: "2026-08-13T12:00:00.000Z" }, new Date("2026-08-13T11:59:00.000Z"))).state)
      .toBe("valid-untrusted");
    expect((await verifySignedAsset(asset, envelope, { ...record, validFrom: "2026-08-13T12:02:00.000Z" }, new Date("2026-08-13T12:01:00.000Z"))).state)
      .toBe("invalid");
  });

  it("rejects future or out-of-validity claim timestamps", async () => {
    const { claim, keyPair, record } = await fixture();
    const future = await signClaim({ ...claim, issuedAt: "2026-08-13T12:05:00.001Z" }, keyPair.privateKey);
    expect((await verifySignedAsset(asset, future, record, new Date("2026-08-13T12:00:00.000Z"))).reasons)
      .toContain("Claim issue time is in the future");
    const tooEarly = await signClaim({ ...claim, issuedAt: "2026-08-12T23:59:59.999Z" }, keyPair.privateKey);
    expect((await verifySignedAsset(asset, tooEarly, record, new Date("2026-08-13T12:00:00.000Z"))).reasons)
      .toContain("Claim issue time is outside the registry validity interval");
  });

  it("rejects altered registry fields and inconsistent revocation records", async () => {
    const { envelope, record } = await fixture();
    expect(() => parseRegistryRecord({ ...record, unexpected: true })).toThrow(/unexpected fields/u);
    expect(() => parseRegistryRecord({ ...record, validFrom: record.validUntil })).toThrow(/increasing/u);
    expect(() => parseRegistryRecord({ ...record, publicKey: { ...record.publicKey, alg: "RS256" } })).toThrow(/P-256 ES256/u);
    expect(() => parseRegistryRecord({ ...record, status: "revoked" })).toThrow(/must agree/u);
    expect(() => parseRegistryRecord({ ...record, identity: { ...record.identity, reviewedAt: null } })).toThrow(/require a review/u);
    expect((await verifySignedAsset(asset, envelope, {
      ...record,
      identity: { ...record.identity, reviewedAt: "2026-08-13T12:02:00.000Z" }
    }, new Date("2026-08-13T12:01:00.000Z"))).reasons).toContain("Registry identity review time is in the future");
    expect((await verifySignedAsset(asset, envelope, {
      ...record,
      status: "revoked",
      revocation: { revokedAt: "2026-08-13T12:02:00.000Z", reason: "Future event" }
    }, new Date("2026-08-13T12:01:00.000Z"))).reasons).toContain("Registry revocation time is in the future");
    const result = await verifySignedAsset(asset, envelope, { ...record, kid: "https://registry.example.test/v1/keys/other" });
    expect(result).toMatchObject({ state: "invalid", signature: "unverified", identity: "invalid" });
  });
});

describe("browser creator keys and CLI stored keys", () => {
  it("keeps the restored browser working key non-extractable and able to sign", async () => {
    const created = await createBrowserCreatorKey("correct-passphrase");
    expect(created.keyPair.privateKey.extractable).toBe(false);
    await expect(crypto.subtle.exportKey("pkcs8", created.keyPair.privateKey)).rejects.toThrow();
    const restored = await restoreBrowserCreatorKey(created.backup, "correct-passphrase");
    expect(restored.keyPair.privateKey.extractable).toBe(false);
    expect(restored.publicJwk).toEqual(created.publicJwk);
    const { envelope } = await fixture();
    const signed = await signClaim(envelope.claim, restored.keyPair.privateKey);
    expect(await verifyCreatorSignature(signed, restored.keyPair.publicKey)).toBe(true);
    await expect(restoreBrowserCreatorKey(created.backup, "wrong-pass")).rejects.toThrow(/decrypt/u);
  });

  it("signs with extractable CLI keys without reusing them for C2PA", async () => {
    const stored = await generateStoredCreatorKey();
    expect(stored.privateJwk.key_ops).toEqual(["sign"]);
    expect(stored.publicJwk.key_ops).toEqual(["verify"]);
    const { claim } = await fixture();
    const envelope = await signClaimWithStoredKey(claim, stored.privateJwk);
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      stored.publicJwk,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
    expect(await verifyCreatorSignature(envelope, publicKey)).toBe(true);
    const browser = await generateCreatorKey();
    await expect(signClaim(claim, browser.privateKey)).resolves.toMatchObject({ claim: { creatorKid: claim.creatorKid } });
  });
});
