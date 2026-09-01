import { c2paLabel, liveRegionText, proofLensLabel, verifierStyles } from "./labels.js";
import type { VerificationReport } from "./types.js";
import { imageCurrentSrc, verifyFromImageElement } from "./image.js";

const ATTACHED = "data-prooflens-attached";
let serial = 0;

function ensureStyles(doc: Document): void {
  if (doc.getElementById("prooflens-verifier-styles") !== null) return;
  const style = doc.createElement("style");
  style.id = "prooflens-verifier-styles";
  style.textContent = verifierStyles;
  doc.head.append(style);
}

function captionHost(img: HTMLImageElement): HTMLElement {
  const figure = img.closest("figure");
  const existing = figure?.querySelector("figcaption");
  if (existing instanceof HTMLElement) return existing;
  if (figure !== null) {
    const caption = img.ownerDocument.createElement("figcaption");
    figure.append(caption);
    return caption;
  }
  const host = img.ownerDocument.createElement("div");
  host.className = "prooflens-caption-host";
  img.insertAdjacentElement("afterend", host);
  return host;
}

function renderDetails(report: VerificationReport): string {
  const reasons = report.reasons.map((reason) => `<li>${escapeHtml(reason)}</li>`).join("");
  return `<p><strong>${escapeHtml(proofLensLabel(report.proofLens.state))}</strong></p>
<p>${escapeHtml(c2paLabel(report.c2pa))}</p>
<p>ProofLens binding: ${escapeHtml(report.proofLens.binding)}; signature: ${escapeHtml(report.proofLens.signature)}; identity: ${escapeHtml(report.proofLens.identity)}.</p>
<p>C2PA signature valid: ${report.c2pa.signatureValid ? "yes" : "no"}; ecosystem trust: ${escapeHtml(report.c2pa.ecosystemTrust)}.</p>
<ul>${reasons}</ul>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function wireWidget(button: HTMLButtonElement, details: HTMLElement): void {
  const toggle = (): void => {
    const expanded = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", expanded ? "false" : "true");
    details.hidden = expanded;
    if (!expanded) details.focus();
  };
  button.addEventListener("click", toggle);
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      toggle();
    }
    if (event.key === "Escape" && button.getAttribute("aria-expanded") === "true") {
      button.setAttribute("aria-expanded", "false");
      details.hidden = true;
      button.focus();
    }
  });
  details.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      button.setAttribute("aria-expanded", "false");
      details.hidden = true;
      button.focus();
    }
  });
}

export async function attach(img: HTMLImageElement): Promise<VerificationReport> {
  ensureStyles(img.ownerDocument);
  const host = captionHost(img);
  serial += 1;
  const detailsId = `prooflens-details-${serial}`;
  const liveId = `prooflens-live-${serial}`;
  let button = host.querySelector<HTMLButtonElement>("button.prooflens-status");
  let details = host.querySelector<HTMLElement>(`#${detailsId}`);
  let live = img.ownerDocument.getElementById(liveId);
  if (button === null) {
    button = img.ownerDocument.createElement("button");
    button.type = "button";
    button.className = "prooflens-status";
    button.setAttribute("aria-expanded", "false");
    button.setAttribute("aria-controls", detailsId);
    button.textContent = "ProofLens: Verifying";
    host.append(button);
  }
  if (details === null) {
    details = img.ownerDocument.createElement("div");
    details.id = detailsId;
    details.className = "prooflens-details";
    details.hidden = true;
    details.tabIndex = -1;
    details.setAttribute("role", "region");
    details.setAttribute("aria-label", "ProofLens and C2PA evidence");
    host.append(details);
    wireWidget(button, details);
  }
  if (live === null) {
    live = img.ownerDocument.createElement("div");
    live.id = liveId;
    live.className = "prooflens-live";
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    host.append(live);
  }
  img.setAttribute(ATTACHED, "true");
  const report = await verifyFromImageElement(img);
  button.textContent = proofLensLabel(report.proofLens.state);
  button.dataset.prooflensState = report.proofLens.state;
  button.dataset.c2paState = report.c2pa.state;
  details.innerHTML = renderDetails(report);
  live.textContent = liveRegionText(report);
  img.dispatchEvent(new CustomEvent("ProofLensVerified", {
    bubbles: true,
    detail: {
      img,
      currentSrc: imageCurrentSrc(img),
      proofLens: report.proofLens.state,
      c2pa: report.c2pa.state,
      report
    }
  }));
  return report;
}

export async function attachAll(root: ParentNode = globalThis.document): Promise<HTMLImageElement[]> {
  const images = [...root.querySelectorAll("img")].filter((img) => {
    if (!(img instanceof HTMLImageElement) || img.getAttribute(ATTACHED) === "true") return false;
    return img.hasAttribute("data-manifest-url")
      || img.hasAttribute("data-prooflens-envelope-url")
      || img.closest("figure")?.querySelector(`script[type="application/prooflens+json"]`) !== null
      || img.closest("figure")?.hasAttribute("data-prooflens-id") === true;
  });
  for (const img of images) await attach(img);
  return images;
}

export function autoAttach(): void {
  const run = (): void => {
    void attachAll();
  };
  if (globalThis.document.readyState === "loading") {
    globalThis.document.addEventListener("DOMContentLoaded", run, { once: true });
  } else {
    run();
  }
}

export const ProofLens = { attach, attachAll, autoAttach };
