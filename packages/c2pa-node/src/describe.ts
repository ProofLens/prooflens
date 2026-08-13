import type { C2paEvidence, C2paEvidenceDescription } from "./types.js";

export function describeC2paEvidence(evidence: C2paEvidence): C2paEvidenceDescription {
  if (evidence.state === "absent") {
    return {
      creatorAuthenticatedByC2pa: false,
      generatorProductSigner: false,
      summary: "No C2PA Content Credential is present. C2PA does not authenticate the human creator."
    };
  }
  if (evidence.state === "invalid") {
    return {
      creatorAuthenticatedByC2pa: false,
      generatorProductSigner: evidence.developmentCredential,
      summary: "C2PA claim or asset integrity failed. This result is independent of ProofLens creator identity and does not authenticate the human creator."
    };
  }
  const trust = evidence.ecosystemTrust === "trusted"
    ? "The validating ecosystem independently trusts the Generator Product credential."
    : "The development/test Generator Product credential is not ecosystem-trusted.";
  return {
    creatorAuthenticatedByC2pa: false,
    generatorProductSigner: true,
    summary: `C2PA Generator Product signature is cryptographically valid. ${trust} C2PA does not authenticate the human creator.`
  };
}
