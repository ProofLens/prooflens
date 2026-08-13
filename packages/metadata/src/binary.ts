import { sha256, type AssetMime, type ProofLensClaim } from "@prooflens/claim";
import { cloneBytes, utf8Bytes } from "./bytes.js";
import { embedJpegComment, embedJpegIptc, extractJpegIptc, extractJpegXmp, preserveJpegComment, replaceJpegXmp } from "./jpeg.js";
import { embedPngText, extractPngText, extractPngXmp, replacePngXmp } from "./png.js";
import {
  descriptiveFromClaim,
  type DescriptiveMetadata,
  type ImageProvenance
} from "./types.js";
import { embedWebpChunk, extractWebpChunk, extractWebpXmp, replaceWebpXmp } from "./webp.js";
import {
  mergeXmpPacket,
  readCompactClaimFromXmp,
  readDescriptiveMetadataFromXmp,
  stripProofLensDescription,
  xmpContainsFinalFileDigest
} from "./xmp.js";

const MIME: ReadonlySet<AssetMime> = new Set(["image/jpeg", "image/png", "image/webp"]);

export function detectAssetMime(source: Uint8Array): AssetMime {
  if (source[0] === 0xff && source[1] === 0xd8) return "image/jpeg";
  if (source[0] === 137 && source[1] === 80 && source[2] === 78 && source[3] === 71) return "image/png";
  if (source[0] === 0x52 && source[1] === 0x49 && source[2] === 0x46 && source[3] === 0x46 && source[8] === 0x57) {
    return "image/webp";
  }
  throw new Error("Unsupported or malformed image type");
}

function assertMime(source: Uint8Array, mime: AssetMime): void {
  if (!MIME.has(mime)) throw new Error("Unsupported image type");
  if (detectAssetMime(source) !== mime) throw new Error("Image bytes do not match the declared MIME type");
}

export function extractXmp(source: Uint8Array, mime: AssetMime): string | undefined {
  assertMime(source, mime);
  if (mime === "image/jpeg") return extractJpegXmp(source);
  if (mime === "image/png") return extractPngXmp(source);
  return extractWebpXmp(source);
}

export function embedXmp(source: Uint8Array, mime: AssetMime, packet: string): Uint8Array<ArrayBuffer> {
  assertMime(source, mime);
  if (mime === "image/jpeg") return replaceJpegXmp(source, packet);
  if (mime === "image/png") return replacePngXmp(source, packet);
  return replaceWebpXmp(source, packet);
}

function replaceXmp(source: Uint8Array, mime: AssetMime, packet: string | undefined): Uint8Array<ArrayBuffer> {
  assertMime(source, mime);
  if (mime === "image/jpeg") return replaceJpegXmp(source, packet);
  if (mime === "image/png") return replacePngXmp(source, packet);
  return replaceWebpXmp(source, packet);
}

export function readImageProvenance(source: Uint8Array, mime: AssetMime): ImageProvenance {
  const packet = extractXmp(source, mime);
  const iptc = mime === "image/jpeg" ? extractJpegIptc(source) : undefined;
  if (packet === undefined) {
    return { descriptive: iptc ?? {}, recursiveFinalFileDigest: false };
  }
  let compactClaim: ImageProvenance["compactClaim"];
  let recursiveFinalFileDigest = false;
  try {
    compactClaim = readCompactClaimFromXmp(packet);
  } catch (error) {
    if (error instanceof Error && /final-file digest/u.test(error.message)) recursiveFinalFileDigest = true;
    else throw error;
  }
  return {
    ...(compactClaim === undefined ? {} : { compactClaim }),
    descriptive: { ...readDescriptiveMetadataFromXmp(packet), ...iptc },
    recursiveFinalFileDigest
  };
}

export async function embedImageProvenance(
  source: Uint8Array,
  mime: AssetMime,
  claim: ProofLensClaim
): Promise<Uint8Array<ArrayBuffer>> {
  const packet = mergeXmpPacket(extractXmp(source, mime), claim);
  let output = embedXmp(source, mime, packet);
  if (mime === "image/jpeg") output = embedJpegIptc(output, descriptiveFromClaim(claim));
  const digest = await sha256(cloneBytes(output));
  if (xmpContainsFinalFileDigest(extractXmp(output, mime) ?? "", digest) || packet.includes(digest)) {
    throw new Error("Embedded ProofLens provenance must not include the final-file digest");
  }
  if (claim.asset.sha256 && (extractXmp(output, mime) ?? "").includes(claim.asset.sha256)) {
    throw new Error("Embedded ProofLens provenance must not include a detached-file digest");
  }
  return output;
}

export function stripProofLensMetadata(source: Uint8Array, mime: AssetMime): Uint8Array<ArrayBuffer> {
  const packet = extractXmp(source, mime);
  if (packet === undefined) return new Uint8Array(source);
  const retained = stripProofLensDescription(packet);
  if (!/<rdf:Description\b/u.test(retained)) return replaceXmp(source, mime, undefined);
  return replaceXmp(source, mime, retained);
}

export function embedUnrelatedMarker(source: Uint8Array, mime: AssetMime, value: string): Uint8Array<ArrayBuffer> {
  assertMime(source, mime);
  if (mime === "image/jpeg") return embedJpegComment(source, value);
  if (mime === "image/png") return embedPngText(source, "prooflens-unrelated", value);
  return embedWebpChunk(source, "unkn", utf8Bytes(value));
}

export function readUnrelatedMarker(source: Uint8Array, mime: AssetMime): string | undefined {
  if (mime === "image/jpeg") return preserveJpegComment(source);
  if (mime === "image/png") return extractPngText(source, "prooflens-unrelated");
  const payload = extractWebpChunk(source, "unkn");
  return payload === undefined ? undefined : new TextDecoder().decode(payload);
}

export async function assertNonRecursiveBinding(bytes: Uint8Array, mime: AssetMime): Promise<void> {
  const digest = await sha256(cloneBytes(bytes));
  const packet = extractXmp(bytes, mime) ?? "";
  if (xmpContainsFinalFileDigest(packet, digest)) {
    throw new Error("Embedded ProofLens provenance contains the final-file digest");
  }
}

export type { DescriptiveMetadata };
