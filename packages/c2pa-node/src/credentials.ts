import "reflect-metadata";
import {
  AuthorityKeyIdentifierExtension,
  BasicConstraintsExtension,
  ExtendedKeyUsageExtension,
  KeyUsageFlags,
  KeyUsagesExtension,
  SubjectKeyIdentifierExtension,
  X509CertificateGenerator,
  cryptoProvider
} from "@peculiar/x509";
import {
  C2PA_DEVELOPMENT_INTERMEDIATE_NAME,
  C2PA_DEVELOPMENT_LEAF_NAME,
  C2PA_DEVELOPMENT_ROOT_NAME,
  C2PA_DOCUMENT_SIGNING_EKU,
  C2PA_EMAIL_PROTECTION_EKU
} from "./constants.js";
import type { DevelopmentC2paCredentials } from "./types.js";

const ALG = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" } as const;
const NOT_BEFORE = new Date("2026-01-01T00:00:00.000Z");
const NOT_AFTER = new Date("2028-01-01T00:00:00.000Z");

cryptoProvider.set(crypto);

function pem(label: string, bytes: ArrayBuffer): string {
  const body = Buffer.from(bytes).toString("base64").match(/.{1,64}/gu)?.join("\n") ?? "";
  return `-----BEGIN ${label}-----\n${body}\n-----END ${label}-----\n`;
}

async function generateKeys(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(ALG, true, ["sign", "verify"]);
}

export function isLabeledDevelopmentC2paCredential(subject: string): boolean {
  return /DEVELOPMENT TEST/u.test(subject);
}

export async function createDevelopmentC2paCredentials(): Promise<DevelopmentC2paCredentials> {
  const rootKeys = await generateKeys();
  const intermediateKeys = await generateKeys();
  const leafKeys = await generateKeys();

  const root = await X509CertificateGenerator.createSelfSigned({
    serialNumber: "01",
    name: C2PA_DEVELOPMENT_ROOT_NAME,
    notBefore: NOT_BEFORE,
    notAfter: NOT_AFTER,
    signingAlgorithm: ALG,
    keys: rootKeys,
    extensions: [
      new BasicConstraintsExtension(true, 1, true),
      new KeyUsagesExtension(KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign, true),
      await SubjectKeyIdentifierExtension.create(rootKeys.publicKey)
    ]
  });

  const intermediate = await X509CertificateGenerator.create({
    serialNumber: "02",
    subject: C2PA_DEVELOPMENT_INTERMEDIATE_NAME,
    issuer: root.subject,
    notBefore: NOT_BEFORE,
    notAfter: NOT_AFTER,
    signingAlgorithm: ALG,
    publicKey: intermediateKeys.publicKey,
    signingKey: rootKeys.privateKey,
    extensions: [
      new BasicConstraintsExtension(true, 0, true),
      new KeyUsagesExtension(KeyUsageFlags.keyCertSign | KeyUsageFlags.cRLSign, true),
      await SubjectKeyIdentifierExtension.create(intermediateKeys.publicKey),
      await AuthorityKeyIdentifierExtension.create(root)
    ]
  });

  const leaf = await X509CertificateGenerator.create({
    serialNumber: "03",
    subject: C2PA_DEVELOPMENT_LEAF_NAME,
    issuer: intermediate.subject,
    notBefore: NOT_BEFORE,
    notAfter: NOT_AFTER,
    signingAlgorithm: ALG,
    publicKey: leafKeys.publicKey,
    signingKey: intermediateKeys.privateKey,
    extensions: [
      new BasicConstraintsExtension(false, undefined, true),
      new KeyUsagesExtension(KeyUsageFlags.digitalSignature, true),
      new ExtendedKeyUsageExtension([C2PA_DOCUMENT_SIGNING_EKU, C2PA_EMAIL_PROTECTION_EKU], false),
      await SubjectKeyIdentifierExtension.create(leafKeys.publicKey),
      await AuthorityKeyIdentifierExtension.create(intermediate)
    ]
  });

  const rootCertificatePem = root.toString("pem");
  const intermediateCertificatePem = intermediate.toString("pem");
  const leafCertificatePem = leaf.toString("pem");
  const leafPrivateKeyPem = pem("PRIVATE KEY", await crypto.subtle.exportKey("pkcs8", leafKeys.privateKey));
  const leafPublicJwk = await crypto.subtle.exportKey("jwk", leafKeys.publicKey);

  if (!isLabeledDevelopmentC2paCredential(leaf.subject) || !isLabeledDevelopmentC2paCredential(root.subject)) {
    throw new Error("Development C2PA credentials must be visibly labeled as test-only");
  }

  return {
    algorithm: "es256",
    purpose: "development-test-only",
    productionTrustRoot: false,
    rootCertificatePem,
    intermediateCertificatePem,
    leafCertificatePem,
    signingCertificateChainPem: `${leafCertificatePem}${intermediateCertificatePem}`,
    leafPrivateKeyPem,
    leafPublicJwk,
    rootSubject: root.subject,
    intermediateSubject: intermediate.subject,
    leafSubject: leaf.subject
  };
}
