import type { ProofLensEnvelope } from "@prooflens/claim";

export const REGISTRY_RECORD_VERSION = "1.0" as const;

export type RegistryStatus = "pending" | "trusted" | "revoked" | "expired";

export interface RegistryPublicJwk {
  kty: "EC";
  crv: "P-256";
  x: string;
  y: string;
  alg: "ES256";
  use: "sig";
  key_ops: ["verify"];
  ext: true;
}

export interface ReviewedIdentity {
  displayName: string;
  reviewedAt: string | null;
}

export interface RevocationRecord {
  revokedAt: string;
  reason: string;
}

export interface RegistryIdentityRecord {
  version: typeof REGISTRY_RECORD_VERSION;
  kid: string;
  publicKey: RegistryPublicJwk;
  identity: ReviewedIdentity;
  status: RegistryStatus;
  validFrom: string;
  validUntil: string;
  revocation: RevocationRecord | null;
}

export type IdentityState = "trusted" | "untrusted" | "revoked" | "expired" | "invalid";

export interface SignedAssetVerification {
  state: "trusted" | "valid-untrusted" | "revoked" | "expired" | "invalid";
  integrity: boolean;
  signature: "valid" | "invalid" | "unverified";
  identity: IdentityState;
  reasons: string[];
  envelope?: ProofLensEnvelope;
  registryRecord?: RegistryIdentityRecord;
}
