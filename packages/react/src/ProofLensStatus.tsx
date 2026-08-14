import { useId, useState, type KeyboardEvent, type ReactElement } from "react";
import {
  c2paLabel,
  liveRegionText,
  proofLensLabel,
  verifierStyles,
  type VerificationReport
} from "@prooflens/verifier";

let stylesInjected = false;

function ensureStyles(): void {
  if (stylesInjected || typeof document === "undefined") return;
  if (document.getElementById("prooflens-verifier-styles") !== null) {
    stylesInjected = true;
    return;
  }
  const style = document.createElement("style");
  style.id = "prooflens-verifier-styles";
  style.textContent = verifierStyles;
  document.head.append(style);
  stylesInjected = true;
}

export interface ProofLensStatusProps {
  report?: VerificationReport;
  status: "idle" | "loading" | "ready" | "error";
  error?: string;
}

export function ProofLensStatus({ report, status, error }: ProofLensStatusProps): ReactElement {
  ensureStyles();
  const detailsId = useId();
  const liveId = useId();
  const [expanded, setExpanded] = useState(false);
  const headline = status === "loading" || status === "idle"
    ? "ProofLens: Verifying"
    : status === "error"
      ? "ProofLens: Invalid"
      : proofLensLabel(report?.proofLens.state ?? "invalid");
  const live = status === "ready" && report !== undefined
    ? liveRegionText(report)
    : status === "error"
      ? `ProofLens: Invalid. ${error ?? "Verification failed"}. C2PA does not authenticate the human creator.`
      : "ProofLens verification in progress.";

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === "Escape" && expanded) {
      setExpanded(false);
      event.currentTarget.focus();
    }
  };

  return (
    <span className="prooflens-caption-host">
      <button
        type="button"
        className="prooflens-status"
        aria-expanded={expanded}
        aria-controls={detailsId}
        data-prooflens-state={report?.proofLens.state ?? (status === "error" ? "invalid" : status)}
        data-c2pa-state={report?.c2pa.state ?? "absent"}
        onClick={() => setExpanded((value) => !value)}
        onKeyDown={onKeyDown}
      >
        {headline}
      </button>
      <div
        id={detailsId}
        className="prooflens-details"
        hidden={!expanded}
        tabIndex={-1}
        role="region"
        aria-label="ProofLens and C2PA evidence"
      >
        {report === undefined
          ? <p>{error ?? "Verification is not ready."}</p>
          : (
            <>
              <p><strong>{proofLensLabel(report.proofLens.state)}</strong></p>
              <p>{c2paLabel(report.c2pa)}</p>
              <p>
                ProofLens binding: {report.proofLens.binding}; signature: {report.proofLens.signature}; identity: {report.proofLens.identity}.
              </p>
              <p>
                C2PA signature valid: {report.c2pa.signatureValid ? "yes" : "no"}; ecosystem trust: {report.c2pa.ecosystemTrust}.
              </p>
              <ul>{report.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
            </>
          )}
      </div>
      <div id={liveId} className="prooflens-live" aria-live="polite" aria-atomic="true">{live}</div>
    </span>
  );
}
