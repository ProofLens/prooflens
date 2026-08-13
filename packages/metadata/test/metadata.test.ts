import { createDetachedAssetBinding, parseEnvelope, sha256, verifyDetachedAssetBinding, type AssetMime, type ProofLensClaim } from "@prooflens/claim";
import { generateFixtures, pixelDigest, type GeneratedFixture } from "@prooflens/fixtures";
import { generateCreatorKey, signClaim } from "@prooflens/identity";
import { describe, expect, it } from "vitest";
import {
  detectAssetMime,
  discoverHtmlProvenance,
  discoverProvenance,
  embedImageProvenance,
  embedUnrelatedMarker,
  embedXmp,
  extractXmp,
  parseCompactEmbeddedClaim,
  readImageProvenance,
  readUnrelatedMarker,
  renderProofFigure,
  stripProofLensMetadata,
  toCompactEmbeddedClaim
} from "../src/index.js";

const unrelatedXmp = `<?xpacket begin="\uFEFF" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
<rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
<rdf:Description rdf:about="" xmlns:example="https://example.test/ns/">
<example:Untouched>keep me</example:Untouched>
</rdf:Description>
</rdf:RDF></x:xmpmeta>
<?xpacket end="w"?>`;

async function claimFor(asset: Awaited<ReturnType<typeof createDetachedAssetBinding>>): Promise<ProofLensClaim> {
  return {
    version: "1.0",
    claimId: "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: "2026-08-13T12:00:00.000Z",
    creatorKid: "https://registry.example.test/v1/keys/creator-1",
    asset,
    creator: {
      displayName: "Phase Two Creator",
      creditLine: "Photo: Phase Two Creator",
      caption: "A <deterministic> caption & credit"
    },
    edits: [],
    locators: {
      claim: "https://claims.example.test/v1/claim-1",
      rights: "https://rights.example.test/statement"
    }
  };
}

describe("compact embedded claims", () => {
  it("omits final-file digest fields and rejects them on parse", async () => {
    const asset = await createDetachedAssetBinding(new Uint8Array([1, 2, 3]), "fixture.jpg", "image/jpeg");
    const compact = toCompactEmbeddedClaim(await claimFor(asset));
    expect(compact.asset).toEqual({ filename: "fixture.jpg", mime: "image/jpeg" });
    expect(compact).not.toHaveProperty("asset.sha256");
    expect(() => parseCompactEmbeddedClaim({
      ...compact,
      asset: { ...compact.asset, sha256: asset.sha256, bytes: asset.bytes }
    })).toThrow(/final-file digest/u);
  });
});

describe("JPEG, PNG, and WebP metadata carriage", () => {
  it.each(["jpeg", "png", "webp"] as const)("preserves pixels, IPTC/XMP, unrelated metadata, and detached binding for %s", async (name) => {
    const fixtures = generateFixtures();
    const generated: GeneratedFixture = fixtures[name];
    const mime: AssetMime = generated.mime;
    const baselinePixels = generated.pixelDigest;
    const withUnrelated = embedUnrelatedMarker(generated.bytes, mime, "keep-me");
    const withXmp = embedXmp(withUnrelated, mime, unrelatedXmp);
    expect(await pixelDigest(withXmp)).toBe(baselinePixels);

    const draft = await claimFor(await createDetachedAssetBinding(withXmp, generated.filename, mime));
    const embedded = await embedImageProvenance(withXmp, mime, draft);
    expect(detectAssetMime(embedded)).toBe(mime);
    expect(await pixelDigest(embedded)).toBe(baselinePixels);
    expect(readUnrelatedMarker(embedded, mime)).toBe("keep-me");

    const packet = extractXmp(embedded, mime);
    expect(packet).toContain("xmlns:prooflens=\"urn:prooflens:ns:xmp:1.0\"");
    expect(packet).toContain("<example:Untouched>keep me</example:Untouched>");
    expect(packet).not.toContain("prooflens.org");
    expect(packet).toContain("A &lt;deterministic&gt; caption &amp; credit");

    const provenance = readImageProvenance(embedded, mime);
    expect(provenance.recursiveFinalFileDigest).toBe(false);
    expect(provenance.compactClaim?.claimId).toBe(draft.claimId);
    expect(provenance.compactClaim?.asset).toEqual({ filename: generated.filename, mime });
    expect(provenance.descriptive).toMatchObject({
      creator: "Phase Two Creator",
      credit: "Photo: Phase Two Creator",
      description: "A <deterministic> caption & credit",
      rightsStatement: "https://rights.example.test/statement"
    });
    if (mime === "image/jpeg") {
      expect(provenance.descriptive.credit).toBe("Photo: Phase Two Creator");
    }

    const binding = await createDetachedAssetBinding(embedded, generated.filename, mime);
    expect(await verifyDetachedAssetBinding(embedded, binding)).toEqual({
      matches: true,
      digestMatches: true,
      sizeMatches: true
    });
    expect(packet).not.toContain(binding.sha256);
    expect(packet).not.toContain(draft.asset.sha256);

    const stripped = stripProofLensMetadata(embedded, mime);
    expect(await pixelDigest(stripped)).toBe(baselinePixels);
    expect(readUnrelatedMarker(stripped, mime)).toBe("keep-me");
    expect(extractXmp(stripped, mime)).toContain("<example:Untouched>keep me</example:Untouched>");
    expect(extractXmp(stripped, mime)).not.toContain("xmlns:prooflens");
    expect((await createDetachedAssetBinding(stripped, generated.filename, mime)).sha256).not.toBe(binding.sha256);

    const keyPair = await generateCreatorKey();
    const envelope = await signClaim({ ...draft, asset: binding }, keyPair.privateKey);
    const figure = renderProofFigure(`/${generated.filename}`, "Fixture", envelope);
    expect(figure).toContain('type="application/prooflens+json"');
    expect(figure).not.toContain('type="text/javascript"');
    expect(figure).toContain("Photo: Phase Two Creator");
    expect(figure).toContain("\\u003cdeterministic");
    const html = discoverHtmlProvenance(figure);
    expect(html.captionMatches).toBe(true);
    expect(html.creditMatches).toBe(true);
    expect(html.envelope).toEqual(parseEnvelope(envelope));

    const discovery = await discoverProvenance({
      bytes: embedded,
      mime,
      html: figure,
      detachedEnvelope: envelope
    });
    expect(discovery).toMatchObject({ state: "consistent", c2pa: "absent", recursiveFinalFileDigest: false });
    expect(discovery.xmp?.claimId).toBe(draft.claimId);
  });

  it.each([
    ["image/jpeg", Uint8Array.of(0xff, 0xd8, 0x00)],
    ["image/png", Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13)],
    ["image/webp", new TextEncoder().encode("RIFF\x10\x00\x00\x00WEBPVP8L")]
  ] as const)("rejects malformed %s instead of transcoding", async (mime, bytes) => {
    await expect(embedImageProvenance(bytes, mime, await claimFor(await createDetachedAssetBinding(bytes, "bad.bin", mime)))).rejects.toThrow(/Malformed|Unsupported/u);
  });

  it("rejects unsupported types and MIME mismatches", async () => {
    const gif = Uint8Array.of(0x47, 0x49, 0x46, 0x38, 0x39, 0x61);
    expect(() => detectAssetMime(gif)).toThrow(/Unsupported/u);
    const fixtures = generateFixtures();
    await expect(embedImageProvenance(fixtures.png.bytes, "image/jpeg", await claimFor(
      await createDetachedAssetBinding(fixtures.png.bytes, "fixture.jpg", "image/jpeg")
    ))).rejects.toThrow(/do not match/u);
  });

  it("treats conflicting HTML, XMP, detached, and legacy claims as invalid", async () => {
    const fixtures = generateFixtures();
    const mime = fixtures.png.mime;
    const draft = await claimFor(await createDetachedAssetBinding(fixtures.png.bytes, fixtures.png.filename, mime));
    const embedded = await embedImageProvenance(fixtures.png.bytes, mime, draft);
    const binding = await createDetachedAssetBinding(embedded, fixtures.png.filename, mime);
    const keyPair = await generateCreatorKey();
    const envelope = await signClaim({ ...draft, asset: binding }, keyPair.privateKey);
    const conflicting = await signClaim({
      ...draft,
      asset: binding,
      claimId: "urn:uuid:7f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
      creator: { ...draft.creator, caption: "A different caption" }
    }, keyPair.privateKey);
    const discovery = await discoverProvenance({
      bytes: embedded,
      mime,
      html: renderProofFigure("/fixture.png", "Fixture", conflicting),
      detachedEnvelope: envelope,
      legacyManifest: { manifest_version: "demo-1", source_sha256: await sha256(embedded) }
    });
    expect(discovery.state).toBe("invalid");
    expect(discovery.reasons.some((reason) => /claimId conflicts/u.test(reason))).toBe(true);
    expect(discovery.reasons).toContain("Legacy demo-1 claim conflicts with a v1 ProofLens claim");
  });
});
