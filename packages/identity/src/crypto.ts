import {
  PROOFLENS_SIGNATURE_ALGORITHM,
  base64UrlToBytes,
  bytesToBase64Url,
  canonicalize,
  parseClaim,
  parseEnvelope,
  utf8,
  type ProofLensClaim,
  type ProofLensEnvelope
} from "@prooflens/claim";
import type { RegistryPublicJwk } from "./types.js";

const P256_ORDER = BigInt("0xffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551");
const P256_HALF_ORDER = P256_ORDER >> 1n;

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt(`0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`);
}

function bigIntTo32Bytes(value: bigint): Uint8Array {
  const hex = value.toString(16).padStart(64, "0");
  return Uint8Array.from(hex.match(/.{2}/gu) ?? [], (pair) => Number.parseInt(pair, 16));
}

function normalizeP256Signature(signature: Uint8Array): Uint8Array {
  if (signature.byteLength !== 64) throw new Error("WebCrypto returned a non-P1363 ECDSA signature");
  const r = bytesToBigInt(signature.subarray(0, 32));
  let s = bytesToBigInt(signature.subarray(32));
  if (r <= 0n || r >= P256_ORDER || s <= 0n || s >= P256_ORDER) throw new Error("WebCrypto returned an invalid P-256 signature");
  if (s > P256_HALF_ORDER) s = P256_ORDER - s;
  const normalized = new Uint8Array(64);
  normalized.set(bigIntTo32Bytes(r), 0);
  normalized.set(bigIntTo32Bytes(s), 32);
  return normalized;
}

export function isCanonicalP256Signature(value: string): boolean {
  try {
    const signature = base64UrlToBytes(value);
    if (signature.byteLength !== 64) return false;
    const r = bytesToBigInt(signature.subarray(0, 32));
    const s = bytesToBigInt(signature.subarray(32));
    return r > 0n && r < P256_ORDER && s > 0n && s <= P256_HALF_ORDER;
  } catch {
    return false;
  }
}

export async function generateCreatorKey(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
}

export async function exportRegistryPublicJwk(publicKey: CryptoKey): Promise<RegistryPublicJwk> {
  const jwk = await crypto.subtle.exportKey("jwk", publicKey);
  if (jwk.kty !== "EC" || jwk.crv !== "P-256" || jwk.x === undefined || jwk.y === undefined || jwk.d !== undefined) {
    throw new Error("Expected a public P-256 key");
  }
  return {
    kty: "EC",
    crv: "P-256",
    x: jwk.x,
    y: jwk.y,
    alg: "ES256",
    use: "sig",
    key_ops: ["verify"],
    ext: true
  };
}

export async function signClaim(value: ProofLensClaim, privateKey: CryptoKey): Promise<ProofLensEnvelope> {
  const claim = parseClaim(value);
  if (privateKey.type !== "private" || privateKey.extractable || privateKey.algorithm.name !== "ECDSA" || !privateKey.usages.includes("sign")) {
    throw new Error("Expected a non-extractable ECDSA creator signing key");
  }
  const signature = normalizeP256Signature(new Uint8Array(await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    utf8(canonicalize(claim))
  )));
  return parseEnvelope({
    claim,
    signature: {
      alg: PROOFLENS_SIGNATURE_ALGORITHM,
      kid: claim.creatorKid,
      value: bytesToBase64Url(signature)
    }
  });
}

export async function verifyCreatorSignature(value: unknown, publicKey: CryptoKey): Promise<boolean> {
  const envelope = parseEnvelope(value);
  if (!isCanonicalP256Signature(envelope.signature.value)) return false;
  return crypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    publicKey,
    base64UrlToBytes(envelope.signature.value),
    utf8(canonicalize(envelope.claim))
  );
}
