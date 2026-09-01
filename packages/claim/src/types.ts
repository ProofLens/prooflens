export const PROOFLENS_CLAIM_VERSION = "1.0" as const;
export const PROOFLENS_SIGNATURE_ALGORITHM = "ES256" as const;

export type AssetMime = "image/jpeg" | "image/png" | "image/webp";

export interface DetachedAssetBinding {
  filename: string;
  mime: AssetMime;
  bytes: number;
  sha256: string;
}

export interface CreatorCredit {
  displayName: string;
  creditLine: string;
  caption: string;
}

export interface EditClaim {
  action: string;
  at: string;
  software?: string;
}

export interface ClaimLocators {
  claim?: string;
  c2pa?: string;
  rights?: string;
}

export interface ProofLensClaim {
  version: typeof PROOFLENS_CLAIM_VERSION;
  claimId: string;
  issuedAt: string;
  creatorKid: string;
  asset: DetachedAssetBinding;
  creator: CreatorCredit;
  edits: EditClaim[];
  locators: ClaimLocators;
}

export interface CreatorSignature {
  alg: typeof PROOFLENS_SIGNATURE_ALGORITHM;
  kid: string;
  value: string;
}

export interface ProofLensEnvelope {
  claim: ProofLensClaim;
  signature: CreatorSignature;
}

export interface Demo1Manifest {
  manifest_version: "demo-1";
  source_sha256?: string;
  source_file?: string;
  asset?: {
    filename?: string;
    mime?: string;
    bytes?: number;
    sha256?: string;
  };
  creator?: string;
  created_at?: string;
  signing?: unknown;
}

export interface LegacyVerificationResult {
  state: "legacy-integrity" | "invalid";
  integrity: boolean;
  signature: "missing";
  identity: "legacy";
  reasons: string[];
  manifest?: Demo1Manifest;
}
