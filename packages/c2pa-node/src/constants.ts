export const PROOFLENS_C2PA_ASSERTION_LABEL = "org.prooflens.claim";
export const PROOFLENS_GENERATOR_PRODUCT_NAME = "ProofLens Generator Product";
export const PROOFLENS_GENERATOR_PRODUCT_VERSION = "1.0.0";
export const C2PA_DEVELOPMENT_LABEL = "DEVELOPMENT TEST";
export const C2PA_NOT_PRODUCTION_ROOT_LABEL = "NOT A PRODUCTION TRUST ROOT";
export const C2PA_DOCUMENT_SIGNING_EKU = "1.3.6.1.5.5.7.3.36";
export const C2PA_EMAIL_PROTECTION_EKU = "1.3.6.1.5.5.7.3.4";
export const C2PA_SOFTWARE_IMAGE_SOURCE = "http://cv.iptc.org/newscodes/digitalsourcetype/softwareImage";

export const C2PA_DEVELOPMENT_ROOT_NAME =
  `CN=ProofLens ${C2PA_DEVELOPMENT_LABEL} C2PA Root — ${C2PA_NOT_PRODUCTION_ROOT_LABEL}, O=ProofLens ${C2PA_DEVELOPMENT_LABEL}, OU=development-test-only`;
export const C2PA_DEVELOPMENT_INTERMEDIATE_NAME =
  `CN=ProofLens ${C2PA_DEVELOPMENT_LABEL} C2PA Intermediate — ${C2PA_NOT_PRODUCTION_ROOT_LABEL}, O=ProofLens ${C2PA_DEVELOPMENT_LABEL}, OU=development-test-only`;
export const C2PA_DEVELOPMENT_LEAF_NAME =
  `CN=${PROOFLENS_GENERATOR_PRODUCT_NAME} ${C2PA_DEVELOPMENT_LABEL} — ${C2PA_NOT_PRODUCTION_ROOT_LABEL}, O=ProofLens ${C2PA_DEVELOPMENT_LABEL}, OU=development-test-only`;

export const C2PA_OFFLINE_VERIFY_SETTINGS = {
  verify: {
    verifyAfterReading: true,
    verifyTrust: true,
    ocspFetch: false,
    remoteManifestFetch: false,
    verifyTimestampTrust: false
  }
} as const;
