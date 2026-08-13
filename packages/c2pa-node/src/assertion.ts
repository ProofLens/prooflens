import { parseCompactEmbeddedClaim, type CompactEmbeddedClaim } from "@prooflens/metadata";
import { PROOFLENS_C2PA_ASSERTION_LABEL } from "./constants.js";
import type { ManifestLike, ManifestStoreLike } from "./types.js";

export const PROOFLENS_C2PA_ASSERTION_VERSION = "1.0" as const;

export interface ProofLensC2paAssertion {
  version: typeof PROOFLENS_C2PA_ASSERTION_VERSION;
  compactClaim: CompactEmbeddedClaim;
}

function object(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

export function createProofLensC2paAssertion(compactClaim: CompactEmbeddedClaim): ProofLensC2paAssertion {
  return { version: PROOFLENS_C2PA_ASSERTION_VERSION, compactClaim: parseCompactEmbeddedClaim(compactClaim) };
}

export function parseProofLensC2paAssertion(value: unknown): ProofLensC2paAssertion {
  const assertion = object(value, "ProofLens C2PA assertion");
  const keys = Object.keys(assertion).sort();
  if (keys.length !== 2 || keys[0] !== "compactClaim" || keys[1] !== "version") {
    throw new Error("ProofLens C2PA assertion contains missing or unexpected fields");
  }
  if (assertion.version !== PROOFLENS_C2PA_ASSERTION_VERSION) throw new Error("Unsupported ProofLens C2PA assertion version");
  return { version: PROOFLENS_C2PA_ASSERTION_VERSION, compactClaim: parseCompactEmbeddedClaim(assertion.compactClaim) };
}

export function findProofLensAssertion(manifest: ManifestLike | undefined): ProofLensC2paAssertion | undefined {
  const entry = manifest?.assertions?.find((assertion) =>
    assertion.label === PROOFLENS_C2PA_ASSERTION_LABEL || assertion.label === `${PROOFLENS_C2PA_ASSERTION_LABEL}.v1`
  );
  return entry === undefined ? undefined : parseProofLensC2paAssertion(entry.data);
}

export function activeManifest(store: ManifestStoreLike): ManifestLike | undefined {
  if (store.active_manifest === undefined || store.manifests === undefined) return undefined;
  return store.manifests[store.active_manifest];
}
