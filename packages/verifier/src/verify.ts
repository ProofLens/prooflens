import { describeC2paEvidence } from "@prooflens/c2pa-node/describe";
import { evaluateC2paEvidence } from "@prooflens/c2pa-node/evidence";
import type { C2paEvidence } from "@prooflens/c2pa-node/types";
import { verifyDemo1Asset, type ProofLensEnvelope } from "@prooflens/claim";
import { parseRegistryRecord, verifySignedAsset } from "@prooflens/identity";
import { discoverProvenance } from "@prooflens/metadata";
import type {
  ProofLensBinding,
  ProofLensEvidence,
  ProofLensHeadlineState,
  RegistryLookupResult,
  VerifyAssetInput,
  VerificationReport
} from "./types.js";

function copyBytes(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function unevaluatedC2pa(): C2paEvidence {
  return {
    present: false,
    signatureValid: false,
    ecosystemTrust: "untrusted",
    developmentCredential: false,
    state: "absent",
    reasons: ["C2PA was not evaluated in this environment"],
    validationStatus: []
  };
}

function proofLens(
  partial: Omit<ProofLensEvidence, "reasons"> & { reasons?: string[] }
): ProofLensEvidence {
  const evidence: ProofLensEvidence = {
    state: partial.state,
    binding: partial.binding,
    signature: partial.signature,
    identity: partial.identity,
    reasons: partial.reasons ?? [],
    registryStatus: partial.registryStatus
  };
  if (partial.envelope !== undefined) evidence.envelope = partial.envelope;
  if (partial.registryRecord !== undefined) evidence.registryRecord = partial.registryRecord;
  return evidence;
}

function reportOf(
  proof: ProofLensEvidence,
  c2pa: C2paEvidence,
  discovery: Awaited<ReturnType<typeof discoverProvenance>>,
  extraReasons: string[] = []
): VerificationReport {
  const reasons = [...proof.reasons, ...c2pa.reasons, ...discovery.reasons, ...extraReasons]
    .filter((reason, index, all) => all.indexOf(reason) === index);
  return {
    state: proof.state,
    proofLens: proof,
    c2pa,
    c2paDescription: describeC2paEvidence(c2pa),
    discovery,
    reasons,
    creatorAuthenticatedByC2pa: false
  };
}

function bindingFor(envelope: ProofLensEnvelope | undefined, c2pa: C2paEvidence, legacy: boolean): ProofLensBinding {
  if (envelope !== undefined) return "detached";
  if (c2pa.compactClaim !== undefined && c2pa.signatureValid) return "c2pa";
  if (legacy) return "legacy";
  return "absent";
}

export async function verifyAsset(input: VerifyAssetInput): Promise<VerificationReport> {
  const c2pa = input.verifyC2pa === undefined
    ? unevaluatedC2pa()
    : await input.verifyC2pa(input.bytes, input.mime);
  let discovery: Awaited<ReturnType<typeof discoverProvenance>>;
  try {
    discovery = await discoverProvenance({
      bytes: input.bytes,
      mime: input.mime,
      ...(input.html === undefined ? {} : { html: input.html }),
      ...(input.detachedEnvelope === undefined ? {} : { detachedEnvelope: input.detachedEnvelope }),
      ...(input.legacyManifest === undefined ? {} : { legacyManifest: input.legacyManifest }),
      ...(c2pa.compactClaim === undefined ? {} : { c2paClaim: c2pa.compactClaim })
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Provenance discovery failed";
    discovery = {
      state: "invalid",
      reasons: [reason],
      c2pa: c2pa.compactClaim ?? "absent",
      recursiveFinalFileDigest: false
    };
  }
  const envelope = discovery.detached ?? discovery.html;
  const now = input.now ?? new Date();

  if (discovery.state === "invalid") {
    return reportOf(proofLens({
      state: "invalid",
      binding: "invalid",
      signature: envelope === undefined ? "missing" : "unverified",
      identity: "invalid",
      registryStatus: "not-requested",
      reasons: discovery.reasons,
      ...(envelope === undefined ? {} : { envelope })
    }), c2pa, discovery);
  }

  if (discovery.legacy !== undefined && envelope === undefined && c2pa.compactClaim === undefined) {
    const legacy = await verifyDemo1Asset(copyBytes(input.bytes), discovery.legacy);
    return reportOf(proofLens({
      state: legacy.state,
      binding: legacy.state === "legacy-integrity" ? "legacy" : "invalid",
      signature: "missing",
      identity: "legacy",
      registryStatus: "not-requested",
      reasons: legacy.reasons
    }), c2pa, discovery);
  }

  if (envelope === undefined) {
    const hasEmbedded = discovery.xmp !== undefined || c2pa.compactClaim !== undefined;
    return reportOf(proofLens({
      state: hasEmbedded ? "valid-untrusted" : "invalid",
      binding: bindingFor(undefined, c2pa, false),
      signature: "missing",
      identity: "untrusted",
      registryStatus: "not-requested",
      reasons: hasEmbedded
        ? ["No creator-signed ProofLens envelope is present; embedded provenance does not establish creator identity"]
        : ["No ProofLens claim, C2PA assertion, or legacy manifest was found"]
    }), c2pa, discovery);
  }

  let registry: RegistryLookupResult;
  if (input.registryRecord !== undefined) {
    registry = { status: "ok", record: input.registryRecord };
  } else if (input.registryLookup !== undefined) {
    registry = await input.registryLookup(envelope.claim.creatorKid);
  } else {
    registry = {
      status: "unavailable",
      reason: "Registry lookup was not configured"
    };
  }

  if (registry.status !== "ok" || registry.record === undefined) {
    return reportOf(proofLens({
      state: "valid-untrusted",
      binding: "detached",
      signature: "unverified",
      identity: "unavailable",
      registryStatus: "unavailable",
      envelope,
      reasons: [registry.reason ?? "Registry is unavailable"]
    }), c2pa, discovery);
  }

  const signed = await verifySignedAsset(copyBytes(input.bytes), envelope, registry.record, now);
  let identity: ProofLensEvidence["identity"] = signed.identity;
  const headline: ProofLensHeadlineState = signed.state;
  try {
    parseRegistryRecord(registry.record);
  } catch {
    identity = "invalid";
  }
  return reportOf(proofLens({
    state: headline,
    binding: signed.integrity ? "detached" : "invalid",
    signature: signed.signature,
    identity,
    registryStatus: "ok",
    reasons: signed.reasons,
    ...(signed.envelope === undefined ? {} : { envelope: signed.envelope }),
    ...(signed.registryRecord === undefined ? {} : { registryRecord: signed.registryRecord })
  }), c2pa, discovery);
}

export { evaluateC2paEvidence };
