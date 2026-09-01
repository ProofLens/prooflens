import { base64UrlToBytes, parseHttpsUrl, parseTimestamp } from "@prooflens/claim";
import {
  REGISTRY_RECORD_VERSION,
  type RegistryIdentityRecord,
  type RegistryPublicJwk,
  type RegistryStatus,
  type RevocationRecord,
  type ReviewedIdentity
} from "./types.js";

const STATUSES = new Set<RegistryStatus>(["pending", "trusted", "revoked", "expired"]);

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[], label: string): void {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(`${label} contains missing or unexpected fields`);
  }
}

function text(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string" || value.trim() === "" || value.length > maximum) {
    throw new Error(`${label} must be a non-empty string of at most ${maximum} characters`);
  }
  return value;
}

function parsePublicKey(value: unknown): RegistryPublicJwk {
  const key = object(value, "registry.publicKey");
  exactKeys(key, ["kty", "crv", "x", "y", "alg", "use", "key_ops", "ext"], "registry.publicKey");
  if (key.kty !== "EC" || key.crv !== "P-256" || key.alg !== "ES256" || key.use !== "sig" || key.ext !== true) {
    throw new Error("registry.publicKey must be a public P-256 ES256 verification key");
  }
  if (!Array.isArray(key.key_ops) || key.key_ops.length !== 1 || key.key_ops[0] !== "verify") {
    throw new Error("registry.publicKey.key_ops must contain only verify");
  }
  if (typeof key.x !== "string" || typeof key.y !== "string") throw new Error("registry.publicKey coordinates must be base64url strings");
  if (base64UrlToBytes(key.x).byteLength !== 32 || base64UrlToBytes(key.y).byteLength !== 32) {
    throw new Error("registry.publicKey coordinates must each contain 32 bytes");
  }
  return {
    kty: "EC",
    crv: "P-256",
    x: key.x,
    y: key.y,
    alg: "ES256",
    use: "sig",
    key_ops: ["verify"],
    ext: true
  };
}

function parseIdentity(value: unknown): ReviewedIdentity {
  const identity = object(value, "registry.identity");
  exactKeys(identity, ["displayName", "reviewedAt"], "registry.identity");
  return {
    displayName: text(identity.displayName, "registry.identity.displayName", 200),
    reviewedAt: identity.reviewedAt === null ? null : parseTimestamp(identity.reviewedAt, "registry.identity.reviewedAt")
  };
}

function parseRevocation(value: unknown): RevocationRecord | null {
  if (value === null) return null;
  const revocation = object(value, "registry.revocation");
  exactKeys(revocation, ["revokedAt", "reason"], "registry.revocation");
  return {
    revokedAt: parseTimestamp(revocation.revokedAt, "registry.revocation.revokedAt"),
    reason: text(revocation.reason, "registry.revocation.reason", 500)
  };
}

export function parseRegistryRecord(value: unknown): RegistryIdentityRecord {
  const record = object(value, "registry record");
  exactKeys(record, ["version", "kid", "publicKey", "identity", "status", "validFrom", "validUntil", "revocation"], "registry record");
  if (record.version !== REGISTRY_RECORD_VERSION) throw new Error("Unsupported registry record version");
  if (!STATUSES.has(record.status as RegistryStatus)) throw new Error("Unsupported registry status");
  const status = record.status as RegistryStatus;
  const identity = parseIdentity(record.identity);
  const validFrom = parseTimestamp(record.validFrom, "registry.validFrom");
  const validUntil = parseTimestamp(record.validUntil, "registry.validUntil");
  if (Date.parse(validFrom) >= Date.parse(validUntil)) throw new Error("Registry validity interval must be increasing");
  const revocation = parseRevocation(record.revocation);
  if (status === "pending" && identity.reviewedAt !== null) throw new Error("Pending registry identities cannot have a review timestamp");
  if (status !== "pending" && identity.reviewedAt === null) throw new Error("Non-pending registry identities require a review timestamp");
  if ((status === "revoked") !== (revocation !== null)) throw new Error("Registry revoked status and revocation record must agree");
  return {
    version: REGISTRY_RECORD_VERSION,
    kid: parseHttpsUrl(record.kid, "registry.kid"),
    publicKey: parsePublicKey(record.publicKey),
    identity,
    status,
    validFrom,
    validUntil,
    revocation
  };
}

export async function importRegistryPublicKey(record: RegistryIdentityRecord): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    record.publicKey,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
}
