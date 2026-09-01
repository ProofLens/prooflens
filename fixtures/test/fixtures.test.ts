import { describe, expect, it } from "vitest";
import { generateFixtures, loadOptionalPhotograph, pixelDigest, sourcePixelDigest, sourcePixels } from "../src/index.js";

describe("deterministic source pixels", () => {
  it("produces a stable RGB gradient independent of encoded containers", () => {
    const pixels = sourcePixels();
    expect(pixels.byteLength).toBe(32 * 32 * 3);
    expect(pixels[0]).toBe(0);
    expect(pixels[1]).toBe(0);
    expect(pixels[2]).toBe(0);
    expect(pixels[3]).toBe(8);
    expect(sourcePixelDigest()).toMatch(/^[a-f0-9]{64}$/u);
  });
});

describe("generated JPEG, PNG, and WebP fixtures", () => {
  it("encodes all three formats from the same source pixels", () => {
    const fixtures = generateFixtures();
    expect(fixtures.jpeg.bytes[0]).toBe(0xff);
    expect(fixtures.jpeg.bytes[1]).toBe(0xd8);
    expect(Array.from(fixtures.png.bytes.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(new TextDecoder().decode(fixtures.webp.bytes.subarray(0, 4))).toBe("RIFF");
    expect(new TextDecoder().decode(fixtures.webp.bytes.subarray(8, 12))).toBe("WEBP");
    expect(fixtures.png.pixelDigest).toBe(fixtures.sourceDigest);
    expect(fixtures.webp.pixelDigest).toBe(fixtures.sourceDigest);
    expect(fixtures.jpeg.pixelDigest).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("does not treat the optional photograph as a reproducibility dependency", async () => {
    const photograph = await loadOptionalPhotograph();
    if (photograph === undefined) {
      expect(photograph).toBeUndefined();
      return;
    }
    expect(photograph.byteLength).toBeGreaterThan(0);
    expect(await pixelDigest(photograph)).toMatch(/^[a-f0-9]{64}$/u);
    expect(await pixelDigest(photograph)).not.toBe(sourcePixelDigest());
  });
});
