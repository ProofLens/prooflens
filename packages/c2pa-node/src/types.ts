import type { CompactEmbeddedClaim } from "@prooflens/metadata";

export interface DevelopmentC2paCredentials {
  algorithm: "es256";
  purpose: "development-test-only";
  productionTrustRoot: false;
  rootCertificatePem: string;
  intermediateCertificatePem: string;
  leafCertificatePem: string;
  signingCertificateChainPem: string;
  leafPrivateKeyPem: string;
  leafPublicJwk: JsonWebKey;
  rootSubject: string;
  intermediateSubject: string;
  leafSubject: string;
}

export type C2paEcosystemTrust = "untrusted" | "trusted";
export type C2paEvidenceState = "absent" | "valid-untrusted" | "trusted" | "invalid";

export interface C2paValidationStatus {
  code: string;
  explanation?: string;
  url?: string;
}

export interface C2paEvidence {
  present: boolean;
  signatureValid: boolean;
  ecosystemTrust: C2paEcosystemTrust;
  developmentCredential: boolean;
  state: C2paEvidenceState;
  reasons: string[];
  caiValidationState?: string;
  validationStatus: C2paValidationStatus[];
  signerSubject?: string;
  compactClaim?: CompactEmbeddedClaim;
}

export interface C2paEvidenceDescription {
  creatorAuthenticatedByC2pa: false;
  generatorProductSigner: boolean;
  summary: string;
}

export interface ManifestStoreLike {
  active_manifest?: string;
  manifests?: Record<string, ManifestLike>;
  validation_state?: string;
  validation_status?: C2paValidationStatus[];
}

export interface ManifestLike {
  claim_generator?: string;
  claim_generator_info?: Array<{ name?: string; version?: string }>;
  title?: string;
  format?: string;
  assertions?: Array<{ label?: string; data?: unknown }>;
  signature_info?: { issuer?: string; common_name?: string; cert_serial_number?: string; alg?: string };
}
