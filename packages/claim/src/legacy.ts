import { sha256 } from "./hash.js";
import type { Demo1Manifest, LegacyVerificationResult } from "./types.js";

const SHA256 = /^[a-f0-9]{64}$/u;

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function parseDemo1Manifest(value: unknown): Demo1Manifest {
  const manifest = object(value, "demo-1 manifest");
  if (manifest.manifest_version !== "demo-1") throw new Error("Unsupported legacy manifest version");
  const asset = manifest.asset === undefined ? undefined : object(manifest.asset, "demo-1 asset");
  const directHash = manifest.source_sha256;
  const assetHash = asset?.sha256;
  if (directHash !== undefined && assetHash !== undefined && directHash !== assetHash) {
    throw new Error("Conflicting legacy SHA-256 fields");
  }
  const digest = directHash ?? assetHash;
  if (typeof digest !== "string" || !SHA256.test(digest)) throw new Error("Legacy manifest has no valid SHA-256 binding");
  if (manifest.source_file !== undefined && asset?.filename !== undefined && manifest.source_file !== asset.filename) {
    throw new Error("Conflicting legacy filename fields");
  }
  if (asset?.bytes !== undefined && (!Number.isSafeInteger(asset.bytes) || Number(asset.bytes) < 0)) {
    throw new Error("Legacy asset byte count is invalid");
  }
  return value as Demo1Manifest;
}

export async function verifyDemo1Asset(bytes: BufferSource, value: unknown): Promise<LegacyVerificationResult> {
  let manifest: Demo1Manifest;
  try {
    manifest = parseDemo1Manifest(value);
  } catch (error) {
    return {
      state: "invalid",
      integrity: false,
      signature: "missing",
      identity: "legacy",
      reasons: [error instanceof Error ? error.message : "Malformed demo-1 manifest"]
    };
  }
  const expected = manifest.source_sha256 ?? manifest.asset?.sha256;
  const digestMatches = expected === await sha256(bytes);
  const sizeMatches = manifest.asset?.bytes === undefined || manifest.asset.bytes === bytes.byteLength;
  if (!digestMatches || !sizeMatches) {
    const reasons: string[] = [];
    if (!digestMatches) reasons.push("Asset bytes do not match the legacy SHA-256 digest");
    if (!sizeMatches) reasons.push("Asset byte count does not match the legacy size");
    return { state: "invalid", integrity: false, signature: "missing", identity: "legacy", reasons, manifest };
  }
  return {
    state: "legacy-integrity",
    integrity: true,
    signature: "missing",
    identity: "legacy",
    reasons: ["Unsigned demo-1 integrity only; creator identity is not authenticated"],
    manifest
  };
}
