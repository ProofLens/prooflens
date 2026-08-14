import { isLabeledDevelopmentC2paCredential } from "./constants.js";
import { activeManifest, findProofLensAssertion } from "./assertion.js";
import type { C2paEvidence, C2paValidationStatus, ManifestStoreLike } from "./types.js";

const INTEGRITY_FAILURE = /(?:mismatch|invalid|malformed|hash\.|signature)/iu;

function asStore(value: unknown): ManifestStoreLike {
  if (typeof value === "string") return JSON.parse(value) as ManifestStoreLike;
  if (value === null || typeof value !== "object") throw new Error("C2PA manifest store must be an object");
  return value as ManifestStoreLike;
}

function statuses(store: ManifestStoreLike): C2paValidationStatus[] {
  return (store.validation_status ?? []).map((status) => {
    const mapped: C2paValidationStatus = { code: status.code };
    if (status.explanation !== undefined) mapped.explanation = status.explanation;
    if (status.url !== undefined) mapped.url = status.url;
    return mapped;
  });
}

export function evaluateC2paEvidence(value: unknown): C2paEvidence {
  if (value === undefined || value === null) {
    return {
      present: false,
      signatureValid: false,
      ecosystemTrust: "untrusted",
      developmentCredential: false,
      state: "absent",
      reasons: ["No C2PA Content Credential is present"],
      validationStatus: []
    };
  }

  const store = asStore(value);
  const manifest = activeManifest(store);
  if (manifest === undefined && (store.manifests === undefined || Object.keys(store.manifests).length === 0)) {
    return {
      present: false,
      signatureValid: false,
      ecosystemTrust: "untrusted",
      developmentCredential: false,
      state: "absent",
      reasons: ["No C2PA Content Credential is present"],
      validationStatus: statuses(store)
    };
  }

  const validationStatus = statuses(store);
  const caiValidationState = store.validation_state;
  const integrityFailed = caiValidationState === "Invalid"
    || validationStatus.some((status) => INTEGRITY_FAILURE.test(status.code) && !/untrusted/iu.test(status.code));
  const caiTrusted = caiValidationState === "Trusted";
  const signatureValid = !integrityFailed && (caiValidationState === "Valid" || caiTrusted || caiValidationState === undefined);
  const signerSubject = manifest?.signature_info?.common_name
    ?? manifest?.signature_info?.issuer
    ?? manifest?.claim_generator_info?.[0]?.name
    ?? manifest?.claim_generator;
  const developmentCredential = [signerSubject, manifest?.signature_info?.issuer, manifest?.signature_info?.common_name]
    .some((value) => value !== undefined && isLabeledDevelopmentC2paCredential(value));
  const ecosystemTrust = caiTrusted && !developmentCredential ? "trusted" : "untrusted";
  const reasons: string[] = [];
  if (integrityFailed) reasons.push("C2PA claim or asset integrity failed");
  if (signatureValid && ecosystemTrust === "untrusted") {
    reasons.push(developmentCredential
      ? "C2PA Generator Product development/test credential is not ecosystem-trusted"
      : "C2PA signing credential is not on a recognized trust list");
  }
  if (developmentCredential) reasons.push("C2PA authenticates the ProofLens Generator Product, not the human creator");

  let compactClaim;
  try {
    compactClaim = findProofLensAssertion(manifest)?.compactClaim;
  } catch (error) {
    reasons.push(error instanceof Error ? error.message : "Malformed ProofLens C2PA assertion");
  }

  const evidence: C2paEvidence = {
    present: true,
    signatureValid: signatureValid && compactClaim !== undefined && !reasons.some((reason) => /Malformed/u.test(reason)),
    ecosystemTrust,
    developmentCredential,
    state: "invalid",
    reasons,
    validationStatus
  };
  if (caiValidationState !== undefined) evidence.caiValidationState = caiValidationState;
  if (signerSubject !== undefined) evidence.signerSubject = signerSubject;
  if (compactClaim !== undefined) evidence.compactClaim = compactClaim;

  if (!evidence.signatureValid || compactClaim === undefined) {
    evidence.state = "invalid";
    evidence.signatureValid = false;
    if (compactClaim === undefined && !reasons.some((reason) => /Malformed/u.test(reason))) {
      reasons.push("Signed C2PA manifest does not contain a ProofLens assertion");
    }
    return evidence;
  }
  evidence.state = ecosystemTrust === "trusted" ? "trusted" : "valid-untrusted";
  return evidence;
}
