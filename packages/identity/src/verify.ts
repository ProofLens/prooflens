import { parseEnvelope, verifyDetachedAssetBinding, type ProofLensEnvelope } from "@prooflens/claim";
import { verifyCreatorSignature } from "./crypto.js";
import { importRegistryPublicKey, parseRegistryRecord } from "./registry.js";
import type { RegistryIdentityRecord, SignedAssetVerification } from "./types.js";

const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

function malformed(reason: string): SignedAssetVerification {
  return { state: "invalid", integrity: false, signature: "unverified", identity: "invalid", reasons: [reason] };
}

export async function verifySignedAsset(
  bytes: BufferSource,
  envelopeValue: unknown,
  registryValue: unknown,
  now = new Date()
): Promise<SignedAssetVerification> {
  if (Number.isNaN(now.getTime())) return malformed("Verification time is invalid");
  let envelope: ProofLensEnvelope;
  try {
    envelope = parseEnvelope(envelopeValue);
  } catch (error) {
    return malformed(error instanceof Error ? error.message : "Malformed ProofLens envelope");
  }
  const binding = await verifyDetachedAssetBinding(bytes, envelope.claim.asset);
  const reasons: string[] = [];
  if (!binding.digestMatches) reasons.push("Asset bytes do not match the signed SHA-256 digest");
  if (!binding.sizeMatches) reasons.push("Asset byte count does not match the signed size");

  let registryRecord: RegistryIdentityRecord;
  try {
    registryRecord = parseRegistryRecord(registryValue);
  } catch (error) {
    return {
      state: "invalid",
      integrity: binding.matches,
      signature: "unverified",
      identity: "invalid",
      reasons: [...reasons, error instanceof Error ? error.message : "Malformed registry record"],
      envelope
    };
  }
  if (registryRecord.kid !== envelope.claim.creatorKid) {
    return {
      state: "invalid",
      integrity: binding.matches,
      signature: "unverified",
      identity: "invalid",
      reasons: [...reasons, "Registry kid does not match the creator kid"],
      envelope,
      registryRecord
    };
  }

  let signatureValid: boolean;
  try {
    signatureValid = await verifyCreatorSignature(envelope, await importRegistryPublicKey(registryRecord));
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) reasons.push("Creator signature is invalid or non-canonical");

  const nowMs = now.getTime();
  const issuedAt = Date.parse(envelope.claim.issuedAt);
  const validFrom = Date.parse(registryRecord.validFrom);
  const validUntil = Date.parse(registryRecord.validUntil);
  if (issuedAt > nowMs + FUTURE_TOLERANCE_MS) reasons.push("Claim issue time is in the future");
  if (issuedAt < validFrom || issuedAt >= validUntil) reasons.push("Claim issue time is outside the registry validity interval");
  if (registryRecord.identity.reviewedAt !== null && Date.parse(registryRecord.identity.reviewedAt) > nowMs) {
    reasons.push("Registry identity review time is in the future");
  }
  if (registryRecord.revocation !== null && Date.parse(registryRecord.revocation.revokedAt) > nowMs) {
    reasons.push("Registry revocation time is in the future");
  }

  if (!binding.matches || !signatureValid || reasons.some((reason) => reason.includes("time is"))) {
    return {
      state: "invalid",
      integrity: binding.matches,
      signature: signatureValid ? "valid" : "invalid",
      identity: "untrusted",
      reasons,
      envelope,
      registryRecord
    };
  }

  if (registryRecord.status === "revoked") {
    return {
      state: "revoked",
      integrity: true,
      signature: "valid",
      identity: "revoked",
      reasons: [`Creator key was revoked at ${registryRecord.revocation?.revokedAt ?? "an unknown time"}`],
      envelope,
      registryRecord
    };
  }
  if (registryRecord.status === "expired" || nowMs >= validUntil) {
    return {
      state: "expired",
      integrity: true,
      signature: "valid",
      identity: "expired",
      reasons: ["Creator identity credential is outside its validity interval"],
      envelope,
      registryRecord
    };
  }
  if (registryRecord.status === "pending" || nowMs < validFrom) {
    return {
      state: "valid-untrusted",
      integrity: true,
      signature: "valid",
      identity: "untrusted",
      reasons: [registryRecord.status === "pending"
        ? "Creator signature is valid but the registry identity is pending review"
        : "Creator signature is valid but the registry credential is not active yet"],
      envelope,
      registryRecord
    };
  }
  return {
    state: "trusted",
    integrity: true,
    signature: "valid",
    identity: "trusted",
    reasons: [],
    envelope,
    registryRecord
  };
}
