import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generateFixtures } from "@prooflens/fixtures";
import type { RegistryIdentityRecord } from "@prooflens/identity";
import { describe, expect, it } from "vitest";
import { runCli } from "../src/commands.js";

describe("prooflens CLI", () => {
  it("signs with creator keys, signs C2PA separately, and verifies without collapsing evidence", async () => {
    const dir = await mkdtemp(join(tmpdir(), "prooflens-cli-"));
    const jpeg = generateFixtures().jpeg;
    const assetPath = join(dir, jpeg.filename);
    await writeFile(assetPath, jpeg.bytes);
    const generate = await runCli(["node", "prooflens", "identity", "generate", "--out", dir]);
    expect(generate.code).toBe(0);
    expect(generate.stdout).toMatch(/must not be used for C2PA/u);

    const envelopePath = join(dir, "claim.json");
    const signed = await runCli([
      "node", "prooflens", "identity", "sign",
      "--key", join(dir, "creator.private.jwk.json"),
      "--asset", assetPath,
      "--kid", "https://registry.example.test/v1/keys/cli",
      "--name", "CLI Creator",
      "--credit", "Photo: CLI Creator",
      "--caption", "CLI caption",
      "--issued-at", "2026-08-13T12:00:00.000Z",
      "--out", envelopePath
    ]);
    expect(signed.code).toBe(0);

    const publicJwk = JSON.parse(await readFile(join(dir, "creator.public.jwk.json"), "utf8")) as {
      x: string;
      y: string;
    };
    const record: RegistryIdentityRecord = {
      version: "1.0",
      kid: "https://registry.example.test/v1/keys/cli",
      publicKey: {
        kty: "EC",
        crv: "P-256",
        x: publicJwk.x,
        y: publicJwk.y,
        alg: "ES256",
        use: "sig",
        key_ops: ["verify"],
        ext: true
      },
      identity: { displayName: "CLI Creator", reviewedAt: "2026-08-12T12:00:00.000Z" },
      status: "trusted",
      validFrom: "2026-08-13T00:00:00.000Z",
      validUntil: "2027-08-13T00:00:00.000Z",
      revocation: null
    };
    const registryPath = join(dir, "registry.json");
    await writeFile(registryPath, `${JSON.stringify(record, null, 2)}\n`);
    const verified = await runCli([
      "node", "prooflens", "verify",
      "--asset", assetPath,
      "--envelope", envelopePath,
      "--registry", registryPath
    ]);
    expect(verified.code).toBe(0);
    const report = JSON.parse(verified.stdout) as {
      state: string;
      c2pa: { state: string };
      creatorAuthenticatedByC2pa: boolean;
    };
    expect(report.state).toBe("trusted");
    expect(report.c2pa.state).toBe("absent");
    expect(report.creatorAuthenticatedByC2pa).toBe(false);

    const c2paOut = join(dir, "signed.jpg");
    const c2pa = await runCli([
      "node", "prooflens", "c2pa", "sign",
      "--asset", assetPath,
      "--claim", envelopePath,
      "--out", c2paOut
    ]);
    expect(c2pa.code).toBe(0);
    const refused = await runCli([
      "node", "prooflens", "c2pa", "sign",
      "--asset", assetPath,
      "--claim", envelopePath,
      "--out", c2paOut,
      "--key", join(dir, "creator.private.jwk.json")
    ]);
    expect(refused.code).toBe(1);
    expect(refused.stderr).toMatch(/creator identity key/u);

    const c2paVerified = await runCli(["node", "prooflens", "verify", "--asset", c2paOut]);
    expect(c2paVerified.code).toBe(0);
    const c2paReport = JSON.parse(c2paVerified.stdout) as {
      proofLens: { state: string };
      c2pa: { state: string; ecosystemTrust: string };
      creatorAuthenticatedByC2pa: boolean;
    };
    expect(c2paReport.c2pa.state).toBe("valid-untrusted");
    expect(c2paReport.c2pa.ecosystemTrust).toBe("untrusted");
    expect(c2paReport.proofLens.state).toBe("valid-untrusted");
    expect(c2paReport.creatorAuthenticatedByC2pa).toBe(false);
  }, 60000);
});
