import { createDetachedAssetBinding, sha256, type ProofLensClaim } from "@prooflens/claim";
import { describeC2paEvidence } from "@prooflens/c2pa-node/describe";
import type { C2paEvidence } from "@prooflens/c2pa-node/types";
import { generateFixtures } from "@prooflens/fixtures";
import {
  exportRegistryPublicJwk,
  generateCreatorKey,
  signClaim,
  type RegistryIdentityRecord
} from "@prooflens/identity";
import { renderProofFigure, toCompactEmbeddedClaim } from "@prooflens/metadata";
import { describe, expect, it } from "vitest";
import { liveRegionText } from "../src/labels.js";
import { verifyAsset } from "../src/verify.js";

const jpeg = generateFixtures().jpeg;
const asset = jpeg.bytes;
const now = new Date("2026-08-13T12:01:00.000Z");

function absentC2pa(): C2paEvidence {
  return {
    present: false,
    signatureValid: false,
    ecosystemTrust: "untrusted",
    developmentCredential: false,
    state: "absent",
    reasons: ["No C2PA Content Credential is present"],
    validationStatus: []
  };
}

function validUntrustedC2pa(claim: ProofLensClaim): C2paEvidence {
  return {
    present: true,
    signatureValid: true,
    ecosystemTrust: "untrusted",
    developmentCredential: true,
    state: "valid-untrusted",
    reasons: [
      "C2PA Generator Product development/test credential is not ecosystem-trusted",
      "C2PA authenticates the ProofLens Generator Product, not the human creator"
    ],
    validationStatus: [],
    compactClaim: toCompactEmbeddedClaim(claim)
  };
}

async function fixture(): Promise<{
  claim: ProofLensClaim;
  envelope: Awaited<ReturnType<typeof signClaim>>;
  record: RegistryIdentityRecord;
}> {
  const keyPair = await generateCreatorKey();
  const creatorKid = "https://registry.example.test/v1/keys/creator-1";
  const claim: ProofLensClaim = {
    version: "1.0",
    claimId: "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: "2026-08-13T12:00:00.000Z",
    creatorKid,
    asset: await createDetachedAssetBinding(asset, jpeg.filename, jpeg.mime),
    creator: { displayName: "Creator One", creditLine: "Photo: Creator One", caption: "Original caption" },
    edits: [],
    locators: { claim: "https://claims.example.test/v1/claim-1" }
  };
  const record: RegistryIdentityRecord = {
    version: "1.0",
    kid: creatorKid,
    publicKey: await exportRegistryPublicJwk(keyPair.publicKey),
    identity: { displayName: "Creator One", reviewedAt: "2026-08-12T12:00:00.000Z" },
    status: "trusted",
    validFrom: "2026-08-13T00:00:00.000Z",
    validUntil: "2027-08-13T00:00:00.000Z",
    revocation: null
  };
  return { claim, envelope: await signClaim(claim, keyPair.privateKey), record };
}

describe("verifyAsset evidence separation", () => {
  it("reports trusted ProofLens independently of untrusted C2PA", async () => {
    const { claim, envelope, record } = await fixture();
    const report = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      detachedEnvelope: envelope,
      registryRecord: record,
      verifyC2pa: async () => validUntrustedC2pa(claim),
      now
    });
    expect(report.state).toBe("trusted");
    expect(report.proofLens.state).toBe("trusted");
    expect(report.proofLens.signature).toBe("valid");
    expect(report.proofLens.identity).toBe("trusted");
    expect(report.c2pa.state).toBe("valid-untrusted");
    expect(report.c2pa.ecosystemTrust).toBe("untrusted");
    expect(report.creatorAuthenticatedByC2pa).toBe(false);
    expect(describeC2paEvidence(report.c2pa).creatorAuthenticatedByC2pa).toBe(false);
    expect(liveRegionText(report)).toContain("ProofLens: Trusted");
    expect(liveRegionText(report)).toContain("does not authenticate the human creator");
  });

  it("does not collapse invalid C2PA into ProofLens trust", async () => {
    const { envelope, record } = await fixture();
    const report = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      detachedEnvelope: envelope,
      registryRecord: record,
      verifyC2pa: async () => ({
        present: true,
        signatureValid: false,
        ecosystemTrust: "untrusted",
        developmentCredential: true,
        state: "invalid",
        reasons: ["C2PA claim or asset integrity failed"],
        validationStatus: []
      }),
      now
    });
    expect(report.proofLens.state).toBe("trusted");
    expect(report.c2pa.state).toBe("invalid");
    expect(report.state).toBe("trusted");
  });

  it("marks conflicts invalid without merging or trusting identity", async () => {
    const { claim, envelope, record } = await fixture();
    const html = renderProofFigure("asset.jpg", "alt", {
      ...envelope,
      claim: {
        ...envelope.claim,
        claimId: "urn:uuid:7f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
        creator: { ...envelope.claim.creator, caption: "A different caption" }
      }
    });
    const report = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      html,
      detachedEnvelope: envelope,
      registryRecord: record,
      verifyC2pa: async () => validUntrustedC2pa(claim),
      now
    });
    expect(report.state).toBe("invalid");
    expect(report.proofLens.state).toBe("invalid");
    expect(report.c2pa.state).toBe("valid-untrusted");
    expect(report.discovery.reasons.some((reason) => /conflict/u.test(reason))).toBe(true);
  });

  it("returns valid-untrusted when the registry is unavailable", async () => {
    const { envelope } = await fixture();
    const report = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      detachedEnvelope: envelope,
      registryLookup: async () => ({ status: "unavailable", reason: "Registry is unavailable" }),
      verifyC2pa: async () => absentC2pa(),
      now
    });
    expect(report.state).toBe("valid-untrusted");
    expect(report.proofLens.identity).toBe("unavailable");
    expect(report.proofLens.signature).toBe("unverified");
    expect(report.proofLens.registryStatus).toBe("unavailable");
  });

  it("separates revoked, expired, pending, and legacy results", async () => {
    const { envelope, record } = await fixture();
    const revoked = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      detachedEnvelope: envelope,
      registryRecord: {
        ...record,
        status: "revoked",
        revocation: { revokedAt: "2026-08-13T12:00:30.000Z", reason: "Creator-requested revocation" }
      },
      verifyC2pa: async () => absentC2pa(),
      now
    });
    expect(revoked.state).toBe("revoked");
    const expired = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      detachedEnvelope: envelope,
      registryRecord: { ...record, status: "expired" },
      verifyC2pa: async () => absentC2pa(),
      now
    });
    expect(expired.state).toBe("expired");
    const pending = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      detachedEnvelope: envelope,
      registryRecord: { ...record, status: "pending", identity: { ...record.identity, reviewedAt: null } },
      verifyC2pa: async () => absentC2pa(),
      now
    });
    expect(pending.state).toBe("valid-untrusted");
    const legacy = await verifyAsset({
      bytes: asset,
      mime: jpeg.mime,
      legacyManifest: {
        manifest_version: "demo-1",
        source_sha256: await sha256(asset),
        creator: "Legacy"
      },
      verifyC2pa: async () => absentC2pa(),
      now
    });
    expect(legacy.state).toBe("legacy-integrity");
    expect(legacy.proofLens.identity).toBe("legacy");
  });
});
