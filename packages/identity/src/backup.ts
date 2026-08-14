import { bytesToBase64Url, base64UrlToBytes, utf8 } from "@prooflens/claim";
import { exportRegistryPublicJwk } from "./crypto.js";
import type { RegistryPublicJwk } from "./types.js";

export const CREATOR_KEY_BACKUP_VERSION = "1.0" as const;
export const CREATOR_KEY_BACKUP_ALG = "PBKDF2-SHA256-AES-GCM" as const;
export const CREATOR_KEY_BACKUP_ITERATIONS = 210_000;

export interface CreatorKeyBackup {
  version: typeof CREATOR_KEY_BACKUP_VERSION;
  alg: typeof CREATOR_KEY_BACKUP_ALG;
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
}

function requirePassphrase(passphrase: string): string {
  if (passphrase.length < 8) throw new Error("Creator key backup passphrase must be at least 8 characters");
  return passphrase;
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey("raw", utf8(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function importNonExtractablePair(privateJwk: JsonWebKey, publicJwk: JsonWebKey): Promise<CryptoKeyPair> {
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    { ...privateJwk, ext: false, key_ops: ["sign"] },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const publicKey = await crypto.subtle.importKey(
    "jwk",
    { ...publicJwk, ext: true, key_ops: ["verify"] },
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["verify"]
  );
  return { privateKey, publicKey };
}

export async function createBrowserCreatorKey(passphrase: string): Promise<{
  keyPair: CryptoKeyPair;
  backup: CreatorKeyBackup;
  publicJwk: RegistryPublicJwk;
}> {
  requirePassphrase(passphrase);
  const extractable = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const privateJwk = await crypto.subtle.exportKey("jwk", extractable.privateKey);
  const publicJwk = await exportRegistryPublicJwk(extractable.publicKey);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrappingKey = await deriveWrappingKey(passphrase, salt, CREATOR_KEY_BACKUP_ITERATIONS);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    wrappingKey,
    utf8(JSON.stringify({ privateJwk, publicJwk }))
  ));
  const keyPair = await importNonExtractablePair(privateJwk, publicJwk);
  return {
    keyPair,
    publicJwk,
    backup: {
      version: CREATOR_KEY_BACKUP_VERSION,
      alg: CREATOR_KEY_BACKUP_ALG,
      iterations: CREATOR_KEY_BACKUP_ITERATIONS,
      salt: bytesToBase64Url(salt),
      iv: bytesToBase64Url(iv),
      ciphertext: bytesToBase64Url(ciphertext)
    }
  };
}

export async function restoreBrowserCreatorKey(backup: CreatorKeyBackup, passphrase: string): Promise<{
  keyPair: CryptoKeyPair;
  publicJwk: RegistryPublicJwk;
}> {
  requirePassphrase(passphrase);
  if (backup.version !== CREATOR_KEY_BACKUP_VERSION || backup.alg !== CREATOR_KEY_BACKUP_ALG) {
    throw new Error("Unsupported creator key backup format");
  }
  if (!Number.isSafeInteger(backup.iterations) || backup.iterations < 210_000) {
    throw new Error("Creator key backup KDF iterations are too low");
  }
  const wrappingKey = await deriveWrappingKey(passphrase, base64UrlToBytes(backup.salt), backup.iterations);
  let payload: { privateJwk?: JsonWebKey; publicJwk?: RegistryPublicJwk };
  try {
    const decrypted = new TextDecoder().decode(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64UrlToBytes(backup.iv) },
      wrappingKey,
      base64UrlToBytes(backup.ciphertext)
    ));
    payload = JSON.parse(decrypted) as { privateJwk?: JsonWebKey; publicJwk?: RegistryPublicJwk };
  } catch (error) {
    throw new Error("Creator key backup could not be decrypted", { cause: error });
  }
  if (payload.privateJwk === undefined || payload.publicJwk === undefined) {
    throw new Error("Creator key backup is missing key material");
  }
  if (payload.privateJwk.d === undefined) throw new Error("Creator key backup is missing the private scalar");
  const keyPair = await importNonExtractablePair(payload.privateJwk, payload.publicJwk);
  return { keyPair, publicJwk: await exportRegistryPublicJwk(keyPair.publicKey) };
}
