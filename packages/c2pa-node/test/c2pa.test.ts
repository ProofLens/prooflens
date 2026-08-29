import { createDetachedAssetBinding, sha256, type AssetMime, type ProofLensClaim } from "@prooflens/claim";
import { generateFixtures, pixelDigest, type GeneratedFixture } from "@prooflens/fixtures";
import { exportRegistryPublicJwk, generateCreatorKey, signClaim } from "@prooflens/identity";
import {
  embedImageProvenance,
  embedUnrelatedMarker,
  embedXmp,
  extractXmp,
  readUnrelatedMarker,
  toCompactEmbeddedClaim
} from "@prooflens/metadata";
import { Reader } from "@contentauth/c2pa-node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createDevelopmentC2paCredentials,
  describeC2paEvidence,
  discoverProvenanceWithC2pa,
  evaluateC2paEvidence,
  signWithGeneratorProduct,
  verifyC2paWithNode
} from "../src/index.js";
import { startWebC2paSession, type WebC2paSession } from "./web-session.js";

const unrelatedXmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:example="https://example.test/ns/"><example:Untouched>keep me</example:Untouched></rdf:Description>
</rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;

async function claimFor(asset: Awaited<ReturnType<typeof createDetachedAssetBinding>>): Promise<ProofLensClaim> {
  return {
    version: "1.0",
    claimId: "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: "2026-08-13T12:00:00.000Z",
    creatorKid: "https://registry.example.test/v1/keys/creator-1",
    asset,
    creator: {
      displayName: "Phase Three Creator",
      creditLine: "Photo: Phase Three Creator",
      caption: "A deterministic caption"
    },
    edits: [],
    locators: { claim: "https://claims.example.test/v1/claim-1" }
  };
}

describe("development C2PA credentials", () => {
  it("are labeled test-only and distinct from creator identity keys", async () => {
    const credentials = await createDevelopmentC2paCredentials();
    const creator = await generateCreatorKey();
    expect(credentials.purpose).toBe("development-test-only");
    expect(credentials.productionTrustRoot).toBe(false);
    expect(credentials.algorithm).toBe("es256");
    expect(credentials.leafSubject).toContain("NOT A PRODUCTION TRUST ROOT");
    expect(credentials.rootSubject).toContain("NOT A PRODUCTION TRUST ROOT");
    expect(credentials.signingCertificateChainPem).toContain("BEGIN CERTIFICATE");
    expect(credentials.leafPrivateKeyPem).toContain("BEGIN PRIVATE KEY");
    expect(credentials.leafPublicJwk.crv).toBe("P-256");
    const creatorJwk = await exportRegistryPublicJwk(creator.publicKey);
    expect(credentials.leafPublicJwk.x).not.toBe(creatorJwk.x);
    expect(credentials.leafPublicJwk.y).not.toBe(creatorJwk.y);
    await expect(crypto.subtle.exportKey("pkcs8", creator.privateKey)).rejects.toThrow();
  });
});

describe("C2PA Generator Product signing", () => {
  let web: WebC2paSession | undefined;

  beforeAll(async () => {
    web = await startWebC2paSession();
  }, 60000);

  afterAll(async () => {
    await web?.close();
  });

  it.each(["jpeg", "png", "webp"] as const)("signs and CAI-validates %s without authenticating the creator", async (name) => {
    const generated: GeneratedFixture = generateFixtures()[name];
    const mime: AssetMime = generated.mime;
    const baselinePixels = generated.pixelDigest;
    const withUnrelated = embedXmp(embedUnrelatedMarker(generated.bytes, mime, "keep-me"), mime, unrelatedXmp);
    const draft = await claimFor(await createDetachedAssetBinding(withUnrelated, generated.filename, mime));
    const compact = toCompactEmbeddedClaim(draft);
    const credentials = await createDevelopmentC2paCredentials();
    const signed = await signWithGeneratorProduct(withUnrelated, mime, compact, credentials);
    expect(await pixelDigest(signed)).toBe(baselinePixels);
    expect(readUnrelatedMarker(signed, mime)).toBe("keep-me");
    expect(extractXmp(signed, mime)).toContain("<example:Untouched>keep me</example:Untouched>");
    expect(Buffer.from(signed).includes(Buffer.from("prooflens.org"))).toBe(false);

    const node = await verifyC2paWithNode(signed, mime);
    const browser = await web!.verify(signed, mime);
    expect(node.present).toBe(true);
    expect(node.signatureValid).toBe(true);
    expect(node.state).toBe("valid-untrusted");
    expect(node.ecosystemTrust).toBe("untrusted");
    expect(node.developmentCredential).toBe(true);
    expect(node.compactClaim).toEqual(compact);
    expect(browser.state).toBe(node.state);
    expect(browser.signatureValid).toBe(true);
    expect(browser.ecosystemTrust).toBe("untrusted");
    expect(browser.compactClaim).toEqual(compact);

    const description = describeC2paEvidence(node);
    expect(description.creatorAuthenticatedByC2pa).toBe(false);
    expect(description.generatorProductSigner).toBe(true);
    expect(description.summary).toMatch(/Generator Product/u);
    expect(description.summary).not.toMatch(/human creator is C2PA-authenticated/u);
    expect(description.summary).toContain("does not authenticate the human creator");

    const digest = await sha256(signed);
    expect(JSON.stringify(node.compactClaim)).not.toContain(digest);
    expect(node.compactClaim?.asset).toEqual({ filename: generated.filename, mime });

    const keyPair = await generateCreatorKey();
    const detached = await signClaim({ ...draft, asset: await createDetachedAssetBinding(signed, generated.filename, mime) }, keyPair.privateKey);
    expect(detached.claim.asset.sha256).toBe(digest);
    expect(JSON.stringify(node.compactClaim)).not.toContain(detached.claim.asset.sha256);

    const discovered = await discoverProvenanceWithC2pa({ bytes: signed, mime, detachedEnvelope: detached });
    expect(discovered.c2pa.state).toBe("valid-untrusted");
    expect(discovered.discovery.state).toBe("consistent");
    expect(discovered.discovery.c2pa).toEqual(compact);

    const tampered = Uint8Array.from(signed);
    tampered[tampered.byteLength - 1] = (tampered[tampered.byteLength - 1] ?? 0) ^ 0xff;
    const broken = await verifyC2paWithNode(tampered, mime);
    expect(broken.state).toBe("invalid");
    expect(broken.signatureValid).toBe(false);
    expect(describeC2paEvidence(broken).creatorAuthenticatedByC2pa).toBe(false);
  }, 30000);

  it("keeps development credentials untrusted even when the test root is supplied as an anchor", async () => {
    const generated = generateFixtures().png;
    const draft = await claimFor(await createDetachedAssetBinding(generated.bytes, generated.filename, generated.mime));
    const credentials = await createDevelopmentC2paCredentials();
    const signed = await signWithGeneratorProduct(generated.bytes, generated.mime, toCompactEmbeddedClaim(draft), credentials);
    const reader = await Reader.fromAsset(
      { buffer: Buffer.from(signed), mimeType: generated.mime },
      { verify: { verifyAfterReading: true, verifyTrust: true, ocspFetch: false, remoteManifestFetch: false }, trust: { userAnchors: credentials.rootCertificatePem } }
    );
    expect(reader).not.toBeNull();
    const cai = evaluateC2paEvidence(reader!.json());
    expect(cai.signatureValid).toBe(true);
    expect(cai.developmentCredential).toBe(true);
    expect(cai.ecosystemTrust).toBe("untrusted");
    expect(cai.state).toBe("valid-untrusted");
    expect(describeC2paEvidence(cai).creatorAuthenticatedByC2pa).toBe(false);
  });

  it("does not merge a conflicting XMP claim with a C2PA assertion", async () => {
    const generated = generateFixtures().jpeg;
    const draft = await claimFor(await createDetachedAssetBinding(generated.bytes, generated.filename, generated.mime));
    const withXmp = await embedImageProvenance(generated.bytes, generated.mime, {
      ...draft,
      claimId: "urn:uuid:7f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
      creator: { ...draft.creator, caption: "A different caption" }
    });
    const credentials = await createDevelopmentC2paCredentials();
    const signed = await signWithGeneratorProduct(withXmp, generated.mime, toCompactEmbeddedClaim(draft), credentials);
    const discovered = await discoverProvenanceWithC2pa({ bytes: signed, mime: generated.mime });
    expect(discovered.discovery.state).toBe("invalid");
    expect(discovered.discovery.reasons.some((reason) => /C2PA/.test(reason))).toBe(true);
    expect(discovered.c2pa.state).toBe("valid-untrusted");
  });
});
