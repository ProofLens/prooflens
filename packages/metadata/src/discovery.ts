import {
  parseDemo1Manifest,
  parseEnvelope,
  sha256,
  verifyDetachedAssetBinding,
  type AssetMime,
  type Demo1Manifest,
  type ProofLensEnvelope
} from "@prooflens/claim";
import { readImageProvenance } from "./binary.js";
import { cloneBytes } from "./bytes.js";
import { discoverHtmlProvenance } from "./html.js";
import type { CompactEmbeddedClaim } from "./types.js";

export interface ProvenanceDiscoveryInput {
  bytes: Uint8Array;
  mime: AssetMime;
  html?: string;
  detachedEnvelope?: unknown;
  legacyManifest?: unknown;
}

export interface ProvenanceDiscovery {
  state: "consistent" | "invalid";
  reasons: string[];
  c2pa: "absent";
  xmp?: CompactEmbeddedClaim;
  html?: ProofLensEnvelope;
  detached?: ProofLensEnvelope;
  legacy?: Demo1Manifest;
  recursiveFinalFileDigest: boolean;
}

interface ComparableClaim {
  source: string;
  claimId: string;
  creatorKid: string;
  caption: string;
}

function compare(left: ComparableClaim, right: ComparableClaim, reasons: string[]): void {
  if (left.claimId !== right.claimId) reasons.push(`${left.source} claimId conflicts with ${right.source}`);
  if (left.creatorKid !== right.creatorKid) reasons.push(`${left.source} creator kid conflicts with ${right.source}`);
  if (left.caption !== right.caption) reasons.push(`${left.source} caption conflicts with ${right.source}`);
}

export async function discoverProvenance(input: ProvenanceDiscoveryInput): Promise<ProvenanceDiscovery> {
  const reasons: string[] = [];
  const image = readImageProvenance(input.bytes, input.mime);
  if (image.recursiveFinalFileDigest) reasons.push("Embedded ProofLens XMP contains a recursive final-file digest");

  const html = input.html === undefined ? undefined : discoverHtmlProvenance(input.html);
  if (html !== undefined && html.envelope !== undefined && (!html.captionMatches || !html.creditMatches)) {
    reasons.push("HTML caption or credit does not match the associated ProofLens envelope");
  }

  let detached: ProofLensEnvelope | undefined;
  if (input.detachedEnvelope !== undefined) {
    detached = parseEnvelope(input.detachedEnvelope);
    const binding = await verifyDetachedAssetBinding(cloneBytes(input.bytes), detached.claim.asset);
    if (!binding.matches) reasons.push("Detached envelope does not bind the exact final file");
  }

  let legacy: Demo1Manifest | undefined;
  if (input.legacyManifest !== undefined) {
    legacy = parseDemo1Manifest(input.legacyManifest);
    const expected = legacy.source_sha256 ?? legacy.asset?.sha256;
    if (expected !== await sha256(cloneBytes(input.bytes))) reasons.push("Legacy demo-1 digest does not match the file");
  }

  const comparables: ComparableClaim[] = [];
  if (image.compactClaim !== undefined) {
    comparables.push({
      source: "XMP",
      claimId: image.compactClaim.claimId,
      creatorKid: image.compactClaim.creatorKid,
      caption: image.compactClaim.creator.caption
    });
  }
  if (html?.envelope !== undefined) {
    comparables.push({
      source: "HTML",
      claimId: html.envelope.claim.claimId,
      creatorKid: html.envelope.claim.creatorKid,
      caption: html.envelope.claim.creator.caption
    });
  }
  if (detached !== undefined) {
    comparables.push({
      source: "detached",
      claimId: detached.claim.claimId,
      creatorKid: detached.claim.creatorKid,
      caption: detached.claim.creator.caption
    });
  }
  for (let index = 0; index < comparables.length; index += 1) {
    for (let next = index + 1; next < comparables.length; next += 1) {
      compare(comparables[index]!, comparables[next]!, reasons);
    }
  }
  if (legacy !== undefined && comparables.length > 0) {
    reasons.push("Legacy demo-1 claim conflicts with a v1 ProofLens claim");
  }

  const result: ProvenanceDiscovery = {
    state: reasons.length === 0 ? "consistent" : "invalid",
    reasons,
    c2pa: "absent",
    recursiveFinalFileDigest: image.recursiveFinalFileDigest
  };
  if (image.compactClaim !== undefined) result.xmp = image.compactClaim;
  if (html?.envelope !== undefined) result.html = html.envelope;
  if (detached !== undefined) result.detached = detached;
  if (legacy !== undefined) result.legacy = legacy;
  return result;
}
