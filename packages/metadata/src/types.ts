import {
  parseHttpsUrl,
  parseKid,
  parseTimestamp,
  type AssetMime,
  type ClaimLocators,
  type CreatorCredit,
  type EditClaim,
  type ProofLensClaim,
  type ProofLensEnvelope
} from "@prooflens/claim";

export const PROOFLENS_XMP_NAMESPACE = "urn:prooflens:ns:xmp:1.0";

export interface CompactAssetRef {
  filename: string;
  mime: AssetMime;
}

export interface CompactEmbeddedClaim {
  version: "1.0";
  claimId: string;
  issuedAt: string;
  creatorKid: string;
  asset: CompactAssetRef;
  creator: CreatorCredit;
  edits: EditClaim[];
  locators: ClaimLocators;
}

export interface DescriptiveMetadata {
  creator?: string;
  credit?: string;
  description?: string;
  rightsStatement?: string;
}

export interface ImageProvenance {
  compactClaim?: CompactEmbeddedClaim;
  descriptive: DescriptiveMetadata;
  recursiveFinalFileDigest: boolean;
}

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

function parseCompactAsset(value: unknown): CompactAssetRef {
  const asset = object(value, "compact claim.asset");
  if ("sha256" in asset || "bytes" in asset) {
    throw new Error("Embedded ProofLens claim must not include a final-file digest or byte length");
  }
  exactKeys(asset, ["filename", "mime"], "compact claim.asset");
  const filename = string(asset.filename, "compact claim.asset.filename", 255);
  if (filename === "." || filename === ".." || filename.includes("/") || filename.includes("\\")) {
    throw new Error("compact claim.asset.filename must be a basename");
  }
  if (asset.mime !== "image/jpeg" && asset.mime !== "image/png" && asset.mime !== "image/webp") {
    throw new Error("compact claim.asset.mime is unsupported");
  }
  return { filename, mime: asset.mime };
}

function parseCreator(value: unknown): CreatorCredit {
  const creator = object(value, "compact claim.creator");
  exactKeys(creator, ["displayName", "creditLine", "caption"], "compact claim.creator");
  return {
    displayName: string(creator.displayName, "compact claim.creator.displayName", 200),
    creditLine: string(creator.creditLine, "compact claim.creator.creditLine", 500),
    caption: string(creator.caption, "compact claim.creator.caption", 4000, true)
  };
}

function parseEdits(value: unknown): EditClaim[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("compact claim.edits must be an array with at most 100 entries");
  return value.map((entry, index) => {
    const edit = object(entry, `compact claim.edits[${index}]`);
    const keys = edit.software === undefined ? ["action", "at"] : ["action", "at", "software"];
    exactKeys(edit, keys, `compact claim.edits[${index}]`);
    const parsed: EditClaim = {
      action: string(edit.action, `compact claim.edits[${index}].action`, 500),
      at: parseTimestamp(edit.at, `compact claim.edits[${index}].at`)
    };
    if (edit.software !== undefined) parsed.software = string(edit.software, `compact claim.edits[${index}].software`, 500);
    return parsed;
  });
}

function parseLocators(value: unknown): ClaimLocators {
  const locators = object(value, "compact claim.locators");
  for (const key of Object.keys(locators)) {
    if (key !== "claim" && key !== "c2pa" && key !== "rights") throw new Error(`compact claim.locators contains an unexpected field: ${key}`);
  }
  const parsed: ClaimLocators = {};
  if (locators.claim !== undefined) parsed.claim = parseHttpsUrl(locators.claim, "compact claim.locators.claim");
  if (locators.c2pa !== undefined) parsed.c2pa = parseHttpsUrl(locators.c2pa, "compact claim.locators.c2pa");
  if (locators.rights !== undefined) parsed.rights = parseHttpsUrl(locators.rights, "compact claim.locators.rights");
  return parsed;
}

export function toCompactEmbeddedClaim(claim: ProofLensClaim): CompactEmbeddedClaim {
  return {
    version: "1.0",
    claimId: claim.claimId,
    issuedAt: claim.issuedAt,
    creatorKid: claim.creatorKid,
    asset: { filename: claim.asset.filename, mime: claim.asset.mime },
    creator: claim.creator,
    edits: claim.edits,
    locators: claim.locators
  };
}

export function parseCompactEmbeddedClaim(value: unknown): CompactEmbeddedClaim {
  const claim = object(value, "compact claim");
  exactKeys(claim, ["version", "claimId", "issuedAt", "creatorKid", "asset", "creator", "edits", "locators"], "compact claim");
  if (claim.version !== "1.0") throw new Error("Unsupported compact ProofLens claim version");
  const claimId = string(claim.claimId, "compact claim.claimId", 45);
  if (!/^urn:uuid:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(claimId)) {
    throw new Error("compact claim.claimId must be a lowercase UUID URN");
  }
  return {
    version: "1.0",
    claimId,
    issuedAt: parseTimestamp(claim.issuedAt, "compact claim.issuedAt"),
    creatorKid: parseKid(claim.creatorKid, "compact claim.creatorKid"),
    asset: parseCompactAsset(claim.asset),
    creator: parseCreator(claim.creator),
    edits: parseEdits(claim.edits),
    locators: parseLocators(claim.locators)
  };
}

export function descriptiveFromClaim(claim: Pick<ProofLensClaim, "creator" | "locators">): DescriptiveMetadata {
  const descriptive: DescriptiveMetadata = {
    creator: claim.creator.displayName,
    credit: claim.creator.creditLine,
    description: claim.creator.caption
  };
  if (claim.locators.rights !== undefined) descriptive.rightsStatement = claim.locators.rights;
  return descriptive;
}

export function containsFinalFileDigest(source: string, sha256: string): boolean {
  return source.includes(sha256);
}

export type HtmlDiscovery = {
  envelope?: ProofLensEnvelope;
  claimLocator?: string;
  legacyManifestUrl?: string;
  captionMatches: boolean;
  creditMatches: boolean;
};
