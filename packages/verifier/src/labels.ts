import type { C2paEvidence } from "@prooflens/c2pa-node/types";
import type { ProofLensHeadlineState, VerificationReport } from "./types.js";

export const C2PA_NOT_CREATOR = "C2PA does not authenticate the human creator.";

export function proofLensLabel(state: ProofLensHeadlineState): string {
  switch (state) {
    case "trusted":
      return "ProofLens: Trusted";
    case "valid-untrusted":
      return "ProofLens: Valid (untrusted identity)";
    case "legacy-integrity":
      return "ProofLens: Legacy integrity";
    case "revoked":
      return "ProofLens: Revoked";
    case "expired":
      return "ProofLens: Expired";
    case "invalid":
      return "ProofLens: Invalid";
  }
}

export function c2paLabel(evidence: C2paEvidence): string {
  if (evidence.state === "absent") return `C2PA: Absent. ${C2PA_NOT_CREATOR}`;
  if (evidence.state === "invalid") return `C2PA: Invalid. ${C2PA_NOT_CREATOR}`;
  if (evidence.state === "trusted") return `C2PA: Trusted Generator Product. ${C2PA_NOT_CREATOR}`;
  return `C2PA: Valid (untrusted Generator Product). ${C2PA_NOT_CREATOR}`;
}

export function liveRegionText(report: VerificationReport): string {
  const reason = report.proofLens.reasons[0] ?? report.reasons[0];
  const extra = reason === undefined || reason === "" ? "" : ` ${reason}.`;
  return `${proofLensLabel(report.proofLens.state)}.${extra} ${c2paLabel(report.c2pa)}`;
}

export const verifierStyles = `
.prooflens-status {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  padding: 0.15rem 0.45rem;
  border: 1px solid currentColor;
  border-radius: 999px;
  background: transparent;
  font: inherit;
  font-size: 0.85em;
  line-height: 1.2;
  cursor: pointer;
}
.prooflens-status:focus-visible {
  outline: 3px solid Highlight;
  outline-offset: 2px;
}
.prooflens-details {
  margin-top: 0.35rem;
  padding: 0.5rem 0.6rem;
  border: 1px solid currentColor;
  border-radius: 0.35rem;
  max-width: 40rem;
}
.prooflens-details[hidden] { display: none; }
.prooflens-live {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.prooflens-caption-host {
  display: block;
  margin-top: 0.35rem;
}
`;
