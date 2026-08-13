import { Builder, LocalSigner } from "@contentauth/c2pa-node";
import { sha256, type AssetMime } from "@prooflens/claim";
import { parseCompactEmbeddedClaim, type CompactEmbeddedClaim } from "@prooflens/metadata";
import { createProofLensC2paAssertion } from "./assertion.js";
import {
  C2PA_SOFTWARE_IMAGE_SOURCE,
  PROOFLENS_C2PA_ASSERTION_LABEL,
  PROOFLENS_GENERATOR_PRODUCT_NAME,
  PROOFLENS_GENERATOR_PRODUCT_VERSION
} from "./constants.js";
import type { DevelopmentC2paCredentials } from "./types.js";

function bufferFrom(bytes: Uint8Array): Buffer {
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

export async function signWithGeneratorProduct(
  bytes: Uint8Array,
  mime: AssetMime,
  compactClaim: CompactEmbeddedClaim,
  credentials: DevelopmentC2paCredentials
): Promise<Uint8Array<ArrayBuffer>> {
  if (credentials.purpose !== "development-test-only" || credentials.productionTrustRoot !== false) {
    throw new Error("Refusing to sign with credentials that are not labeled development/test-only");
  }
  const assertion = createProofLensC2paAssertion(parseCompactEmbeddedClaim(compactClaim));
  const builder = Builder.withJson({
    claim_generator_info: [{
      name: `${PROOFLENS_GENERATOR_PRODUCT_NAME} ${credentials.purpose.replaceAll("-", " ")}`,
      version: PROOFLENS_GENERATOR_PRODUCT_VERSION
    }],
    title: compactClaim.asset.filename,
    format: mime
  });
  builder.setIntent({ create: C2PA_SOFTWARE_IMAGE_SOURCE });
  builder.addAssertion(PROOFLENS_C2PA_ASSERTION_LABEL, assertion);
  const signer = LocalSigner.newSigner(
    Buffer.from(credentials.signingCertificateChainPem),
    Buffer.from(credentials.leafPrivateKeyPem),
    "es256"
  );
  const dest: { buffer: Buffer | null } = { buffer: null };
  builder.sign(signer, { buffer: bufferFrom(bytes), mimeType: mime }, dest);
  if (dest.buffer === null) throw new Error("C2PA signing did not produce an output asset");
  const signed = Uint8Array.from(dest.buffer);
  const digest = await sha256(signed);
  if (JSON.stringify(assertion).includes(digest)) {
    throw new Error("Embedded ProofLens C2PA assertion must not contain a recursive final-file digest");
  }
  return signed;
}
