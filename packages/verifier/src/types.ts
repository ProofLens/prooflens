import type { C2paEvidence, C2paEvidenceDescription } from "@prooflens/c2pa-node/types";
import type { AssetMime, ProofLensEnvelope } from "@prooflens/claim";
import type { IdentityState, RegistryIdentityRecord, SignedAssetVerification } from "@prooflens/identity";
import type { ProvenanceDiscovery } from "@prooflens/metadata";

export type ProofLensHeadlineState =
  | "trusted"
  | "valid-untrusted"
  | "legacy-integrity"
  | "revoked"
  | "expired"
  | "invalid";

export type ProofLensBinding = "detached" | "c2pa" | "legacy" | "absent" | "invalid";
export type RegistryAvailability = "ok" | "unavailable" | "not-requested";

export interface ProofLensEvidence {
  state: ProofLensHeadlineState;
  binding: ProofLensBinding;
  signature: SignedAssetVerification["signature"] | "missing";
  identity: IdentityState | "legacy" | "unavailable";
  reasons: string[];
  registryStatus: RegistryAvailability;
  envelope?: ProofLensEnvelope;
  registryRecord?: RegistryIdentityRecord;
}

export interface VerificationReport {
  state: ProofLensHeadlineState;
  proofLens: ProofLensEvidence;
  c2pa: C2paEvidence;
  c2paDescription: C2paEvidenceDescription;
  discovery: ProvenanceDiscovery;
  reasons: string[];
  creatorAuthenticatedByC2pa: false;
}

export type C2paVerifyFn = (bytes: Uint8Array, mime: AssetMime) => Promise<C2paEvidence>;
export type RegistryLookup = (kid: string) => Promise<RegistryLookupResult>;

export interface RegistryLookupResult {
  status: RegistryAvailability;
  record?: unknown;
  reason?: string;
}

export interface VerifyAssetInput {
  bytes: Uint8Array;
  mime: AssetMime;
  html?: string;
  detachedEnvelope?: unknown;
  legacyManifest?: unknown;
  registryRecord?: unknown;
  registryLookup?: RegistryLookup;
  verifyC2pa?: C2paVerifyFn;
  now?: Date;
}

export interface FetchFailure {
  ok: false;
  kind: "offline" | "cors" | "unavailable" | "http";
  reason: string;
}

export interface FetchSuccess<T> {
  ok: true;
  value: T;
}
