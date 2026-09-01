import { parseCanonicalJson } from "./canonical.js";
import { base64UrlToBytes } from "./encoding.js";
import {
  PROOFLENS_CLAIM_VERSION,
  PROOFLENS_SIGNATURE_ALGORITHM,
  type AssetMime,
  type ClaimLocators,
  type CreatorCredit,
  type CreatorSignature,
  type DetachedAssetBinding,
  type EditClaim,
  type ProofLensClaim,
  type ProofLensEnvelope
} from "./types.js";

const SHA256 = /^[a-f0-9]{64}$/u;
const UUID_URN = /^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u;
const MIME = new Set<AssetMime>(["image/jpeg", "image/png", "image/webp"]);

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

function string(value: unknown, label: string, maximum: number, allowEmpty = false): string {
  if (typeof value !== "string" || value.length > maximum || (!allowEmpty && value.trim() === "")) {
    throw new Error(`${label} must be ${allowEmpty ? "a" : "a non-empty"} string of at most ${maximum} characters`);
  }
  return value;
}

export function parseTimestamp(value: unknown, label: string): string {
  const timestamp = string(value, label, 24);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(timestamp)) {
    throw new Error(`${label} must be an RFC 3339 UTC timestamp with milliseconds`);
  }
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== timestamp) throw new Error(`${label} is not a valid timestamp`);
  return timestamp;
}

export function parseHttpsUrl(value: unknown, label: string): string {
  const locator = string(value, label, 2048);
  let parsed: URL;
  try {
    parsed = new URL(locator);
  } catch (error) {
    throw new Error(`${label} must be an absolute HTTPS URL`, { cause: error });
  }
  if (parsed.protocol !== "https:" || parsed.username !== "" || parsed.password !== "") {
    throw new Error(`${label} must be an absolute HTTPS URL without credentials`);
  }
  return locator;
}

export function parseKid(value: unknown, label = "creator kid"): string {
  return parseHttpsUrl(value, label);
}

function parseAsset(value: unknown): DetachedAssetBinding {
  const asset = object(value, "claim.asset");
  exactKeys(asset, ["filename", "mime", "bytes", "sha256"], "claim.asset");
  const filename = string(asset.filename, "claim.asset.filename", 255);
  if (filename === "." || filename === ".." || filename.includes("/") || filename.includes("\\")) {
    throw new Error("claim.asset.filename must be a basename");
  }
  if (!MIME.has(asset.mime as AssetMime)) throw new Error("claim.asset.mime is unsupported");
  if (!Number.isSafeInteger(asset.bytes) || Number(asset.bytes) < 0) {
    throw new Error("claim.asset.bytes must be a non-negative safe integer");
  }
  if (typeof asset.sha256 !== "string" || !SHA256.test(asset.sha256)) {
    throw new Error("claim.asset.sha256 must be lowercase SHA-256 hex");
  }
  return { filename, mime: asset.mime as AssetMime, bytes: Number(asset.bytes), sha256: asset.sha256 };
}

function parseCreator(value: unknown): CreatorCredit {
  const creator = object(value, "claim.creator");
  exactKeys(creator, ["displayName", "creditLine", "caption"], "claim.creator");
  return {
    displayName: string(creator.displayName, "claim.creator.displayName", 200),
    creditLine: string(creator.creditLine, "claim.creator.creditLine", 500),
    caption: string(creator.caption, "claim.creator.caption", 4000, true)
  };
}

function parseEdits(value: unknown): EditClaim[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("claim.edits must be an array with at most 100 entries");
  return value.map((entry, index) => {
    const edit = object(entry, `claim.edits[${index}]`);
    const keys = edit.software === undefined ? ["action", "at"] : ["action", "at", "software"];
    exactKeys(edit, keys, `claim.edits[${index}]`);
    const parsed: EditClaim = {
      action: string(edit.action, `claim.edits[${index}].action`, 500),
      at: parseTimestamp(edit.at, `claim.edits[${index}].at`)
    };
    if (edit.software !== undefined) parsed.software = string(edit.software, `claim.edits[${index}].software`, 500);
    return parsed;
  });
}

function parseLocators(value: unknown): ClaimLocators {
  const locators = object(value, "claim.locators");
  for (const key of Object.keys(locators)) {
    if (key !== "claim" && key !== "c2pa" && key !== "rights") throw new Error(`claim.locators contains an unexpected field: ${key}`);
  }
  const parsed: ClaimLocators = {};
  if (locators.claim !== undefined) parsed.claim = parseHttpsUrl(locators.claim, "claim.locators.claim");
  if (locators.c2pa !== undefined) parsed.c2pa = parseHttpsUrl(locators.c2pa, "claim.locators.c2pa");
  if (locators.rights !== undefined) parsed.rights = parseHttpsUrl(locators.rights, "claim.locators.rights");
  return parsed;
}

export function parseClaim(value: unknown): ProofLensClaim {
  const claim = object(value, "claim");
  exactKeys(claim, ["version", "claimId", "issuedAt", "creatorKid", "asset", "creator", "edits", "locators"], "claim");
  if (claim.version !== PROOFLENS_CLAIM_VERSION) throw new Error("Unsupported ProofLens claim version");
  const claimId = string(claim.claimId, "claim.claimId", 45);
  if (!UUID_URN.test(claimId)) throw new Error("claim.claimId must be a lowercase UUID URN");
  return {
    version: PROOFLENS_CLAIM_VERSION,
    claimId,
    issuedAt: parseTimestamp(claim.issuedAt, "claim.issuedAt"),
    creatorKid: parseKid(claim.creatorKid, "claim.creatorKid"),
    asset: parseAsset(claim.asset),
    creator: parseCreator(claim.creator),
    edits: parseEdits(claim.edits),
    locators: parseLocators(claim.locators)
  };
}

function parseSignature(value: unknown, creatorKid: string): CreatorSignature {
  const signature = object(value, "signature");
  exactKeys(signature, ["alg", "kid", "value"], "signature");
  if (signature.alg !== PROOFLENS_SIGNATURE_ALGORITHM) throw new Error("Unsupported creator signature algorithm");
  const kid = parseKid(signature.kid, "signature.kid");
  if (kid !== creatorKid) throw new Error("signature.kid conflicts with claim.creatorKid");
  if (typeof signature.value !== "string") throw new Error("signature.value must be base64url");
  const decoded = base64UrlToBytes(signature.value);
  if (decoded.byteLength !== 64 || signature.value.length !== 86) {
    throw new Error("signature.value must contain a canonical 64-byte ES256 signature");
  }
  return { alg: PROOFLENS_SIGNATURE_ALGORITHM, kid, value: signature.value };
}

export function parseEnvelope(value: unknown): ProofLensEnvelope {
  const envelope = object(value, "envelope");
  exactKeys(envelope, ["claim", "signature"], "envelope");
  const claim = parseClaim(envelope.claim);
  return { claim, signature: parseSignature(envelope.signature, claim.creatorKid) };
}

export function parseCanonicalEnvelope(source: string): ProofLensEnvelope {
  return parseEnvelope(parseCanonicalJson(source));
}
