import { parseEnvelope, type ProofLensClaim, type ProofLensEnvelope } from "@prooflens/claim";
import { exportRegistryPublicJwk, signClaim } from "./crypto.js";
import type { RegistryPublicJwk } from "./types.js";

export interface StoredCreatorPrivateJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  d: string;
  alg: "ES256";
  use: "sig";
  key_ops: ["sign"];
  ext: true;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function parseStoredCreatorPrivateJwk(value: unknown): StoredCreatorPrivateJwk {
  const key = object(value, "stored creator private JWK");
  if (key.kty !== "EC" || key.crv !== "P-256" || key.alg !== "ES256" || key.use !== "sig" || key.ext !== true) {
    throw new Error("Stored creator private JWK must be an extractable P-256 ES256 signing key");
  }
  if (!Array.isArray(key.key_ops) || key.key_ops.length !== 1 || key.key_ops[0] !== "sign") {
    throw new Error("Stored creator private JWK key_ops must contain only sign");
  }
  if (typeof key.x !== "string" || typeof key.y !== "string" || typeof key.d !== "string") {
    throw new Error("Stored creator private JWK must include x, y, and d");
  }
  if (key.key_ops.includes("c2pa") || "c2pa" in key) {
    throw new Error("Creator identity keys cannot be used for C2PA Generator Product signing");
  }
  return {
    kty: "EC",
    crv: "P-256",
    x: key.x,
    y: key.y,
    d: key.d,
    alg: "ES256",
    use: "sig",
    key_ops: ["sign"],
    ext: true
  };
}

export async function generateStoredCreatorKey(): Promise<{
  privateJwk: StoredCreatorPrivateJwk;
  publicJwk: RegistryPublicJwk;
}> {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  if (privateJwk.d === undefined) throw new Error("Failed to export a stored creator private JWK");
  return {
    privateJwk: parseStoredCreatorPrivateJwk({
      kty: "EC",
      crv: "P-256",
      x: privateJwk.x,
      y: privateJwk.y,
      d: privateJwk.d,
      alg: "ES256",
      use: "sig",
      key_ops: ["sign"],
      ext: true
    }),
    publicJwk: await exportRegistryPublicJwk(pair.publicKey)
  };
}

export async function importStoredCreatorPrivateKey(value: unknown): Promise<CryptoKey> {
  const jwk = parseStoredCreatorPrivateJwk(value);
  return crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, true, ["sign"]);
}

export async function signClaimWithStoredKey(claim: ProofLensClaim, privateJwk: unknown): Promise<ProofLensEnvelope> {
  return parseEnvelope(await signClaim(claim, await importStoredCreatorPrivateKey(privateJwk), { allowExtractable: true }));
}
