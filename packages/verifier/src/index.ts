export { verifyC2paInBrowser } from "./c2pa-web.js";
export { fetchJsonResource, fetchResource, lookupRegistryByKid } from "./fetch.js";
export { imageCurrentSrc, verifyFromImageElement } from "./image.js";
export { c2paLabel, liveRegionText, proofLensLabel, verifierStyles } from "./labels.js";
export { verifyAsset } from "./verify.js";
export { attach, attachAll, autoAttach, ProofLens } from "./auto-attach.js";
export type {
  C2paVerifyFn,
  FetchFailure,
  FetchSuccess,
  ProofLensBinding,
  ProofLensEvidence,
  ProofLensHeadlineState,
  RegistryAvailability,
  RegistryLookup,
  RegistryLookupResult,
  VerificationReport,
  VerifyAssetInput
} from "./types.js";
