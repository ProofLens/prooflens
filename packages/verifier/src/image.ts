import { detectAssetMime } from "@prooflens/metadata";
import { verifyC2paInBrowser } from "./c2pa-web.js";
import { fetchJsonResource, fetchResource, lookupRegistryByKid, type FetchImpl } from "./fetch.js";
import type { C2paVerifyFn, RegistryLookup, VerificationReport, VerifyAssetInput } from "./types.js";
import { verifyAsset } from "./verify.js";

async function waitForImage(img: HTMLImageElement): Promise<void> {
  try {
    await img.decode();
    return;
  } catch {
    if (img.complete && img.naturalWidth > 0) return;
    throw new Error("Image failed to load");
  }
}

export function imageCurrentSrc(img: HTMLImageElement): string {
  return img.currentSrc || img.src;
}

function provenanceHtml(html: string): string {
  return html
    .replace(/<button\b[^>]*class="[^"]*prooflens-status[^"]*"[\s\S]*?<\/button>/gu, "")
    .replace(/<div\b[^>]*class="[^"]*prooflens-details[^"]*"[\s\S]*?<\/div>/gu, "")
    .replace(/<div\b[^>]*class="[^"]*prooflens-live[^"]*"[\s\S]*?<\/div>/gu, "")
    .replace(/<span\b[^>]*class="[^"]*prooflens-caption-host[^"]*"[\s\S]*?<\/span>/gu, "");
}

export async function verifyFromImageElement(
  img: HTMLImageElement,
  options: {
    htmlSnapshot?: string;
    registryLookup?: RegistryLookup;
    verifyC2pa?: C2paVerifyFn;
    now?: Date;
    fetchImpl?: FetchImpl;
    online?: boolean;
    registryRecord?: unknown;
    detachedEnvelope?: unknown;
    legacyManifest?: unknown;
  } = {}
): Promise<VerificationReport> {
  try {
    await waitForImage(img);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Image failed to load";
    return verifyAsset({
      bytes: new Uint8Array(),
      mime: "image/jpeg",
      verifyC2pa: async () => ({
        present: false,
        signatureValid: false,
        ecosystemTrust: "untrusted",
        developmentCredential: false,
        state: "absent",
        reasons: [reason],
        validationStatus: []
      })
    }).then((report) => ({
      ...report,
      state: "invalid" as const,
      proofLens: { ...report.proofLens, state: "invalid" as const, binding: "invalid" as const, reasons: [reason, ...report.proofLens.reasons] },
      reasons: [reason, ...report.reasons]
    }));
  }
  const source = imageCurrentSrc(img);
  if (source === "") throw new Error("Image has no currentSrc or src to verify");
  const figure = img.closest("figure");
  const html = provenanceHtml(options.htmlSnapshot ?? figure?.outerHTML ?? "");
  const sidecarUrl = img.getAttribute("data-prooflens-envelope-url")
    ?? figure?.getAttribute("data-prooflens-envelope-url")
    ?? undefined;
  const legacyUrl = img.getAttribute("data-manifest-url")
    ?? figure?.getAttribute("data-manifest-url")
    ?? undefined;

  let detachedEnvelope = options.detachedEnvelope;
  let legacyManifest = options.legacyManifest;
  const fetchOpts: { fetchImpl?: FetchImpl; online?: boolean } = {};
  if (options.fetchImpl !== undefined) fetchOpts.fetchImpl = options.fetchImpl;
  if (options.online !== undefined) fetchOpts.online = options.online;
  if (detachedEnvelope === undefined && sidecarUrl !== undefined) {
    const sidecar = await fetchJsonResource(sidecarUrl, { ...fetchOpts, purpose: "asset" });
    if (sidecar.ok) detachedEnvelope = sidecar.value;
  }
  if (legacyManifest === undefined && legacyUrl !== undefined) {
    const sidecar = await fetchJsonResource(legacyUrl, { ...fetchOpts, purpose: "asset" });
    if (sidecar.ok) {
      const value = sidecar.value;
      if (value !== null && typeof value === "object" && (value as { manifest_version?: unknown }).manifest_version === "demo-1") {
        legacyManifest = value;
      } else if (detachedEnvelope === undefined) {
        detachedEnvelope = value;
      }
    }
  }

  const bytesResult = await fetchResource(source, { ...fetchOpts, purpose: "asset" });
  const registryLookup = options.registryLookup ?? ((kid: string) => lookupRegistryByKid(kid, fetchOpts));

  if (!bytesResult.ok) {
    const empty = new Uint8Array();
    const mime = "image/jpeg";
    const input: VerifyAssetInput = {
      bytes: empty,
      mime,
      verifyC2pa: async () => ({
        present: false,
        signatureValid: false,
        ecosystemTrust: "untrusted",
        developmentCredential: false,
        state: "absent",
        reasons: [bytesResult.reason],
        validationStatus: []
      }),
      registryLookup,
      ...(html === "" ? {} : { html }),
      ...(detachedEnvelope === undefined ? {} : { detachedEnvelope }),
      ...(legacyManifest === undefined ? {} : { legacyManifest }),
      ...(options.registryRecord === undefined ? {} : { registryRecord: options.registryRecord }),
      ...(options.now === undefined ? {} : { now: options.now })
    };
    const report = await verifyAsset(input);
    return {
      ...report,
      state: "invalid",
      proofLens: {
        ...report.proofLens,
        state: "invalid",
        binding: "invalid",
        reasons: [bytesResult.reason, ...report.proofLens.reasons]
      },
      reasons: [bytesResult.reason, ...report.reasons]
    };
  }

  const mime = detectAssetMime(bytesResult.value);
  return verifyAsset({
    bytes: bytesResult.value,
    mime,
    verifyC2pa: options.verifyC2pa ?? verifyC2paInBrowser,
    registryLookup,
    ...(html === "" ? {} : { html }),
    ...(detachedEnvelope === undefined ? {} : { detachedEnvelope }),
    ...(legacyManifest === undefined ? {} : { legacyManifest }),
    ...(options.registryRecord === undefined ? {} : { registryRecord: options.registryRecord }),
    ...(options.now === undefined ? {} : { now: options.now })
  });
}
