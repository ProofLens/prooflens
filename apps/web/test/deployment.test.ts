import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const appRoot = resolve(import.meta.dirname, "..");
const repoRoot = resolve(appRoot, "../..");

describe("Phase 6 deployment inputs", () => {
  it("keeps preview and production Worker and D1 resources isolated", async () => {
    const config = JSON.parse(await readFile(resolve(appRoot, "wrangler.jsonc"), "utf8")) as {
      name: string;
      assets: { run_worker_first: string[]; not_found_handling: string };
      env: Record<string, { vars: { ENVIRONMENT: string }; d1_databases: Array<{ database_name: string }> }>;
    };
    expect(config.name).toBe("prooflens");
    expect(config.assets.run_worker_first).toEqual(["/api/*"]);
    expect(config.assets.not_found_handling).toBe("single-page-application");
    expect(config.env.preview?.vars.ENVIRONMENT).toBe("preview");
    expect(config.env.production?.vars.ENVIRONMENT).toBe("production");
    expect(config.env.preview?.d1_databases[0]?.database_name).toBe("prooflens-registry-preview");
    expect(config.env.production?.d1_databases[0]?.database_name).toBe("prooflens-registry-production");
  });

  it("seeds only the reviewed golden identity and detached manifest", async () => {
    const seed = await readFile(resolve(appRoot, "seeds/phase6-reviewed.sql"), "utf8");
    const vector = JSON.parse(await readFile(resolve(repoRoot, "packages/claim/vectors/prooflens-v1-es256.json"), "utf8")) as {
      envelope: { signature: { value: string } };
      publicJwk: { x: string; y: string };
    };
    expect(seed.match(/INSERT INTO/gu)).toHaveLength(2);
    expect(seed).toContain(vector.publicJwk.x);
    expect(seed).toContain(vector.publicJwk.y);
    expect(seed).toContain(vector.envelope.signature.value);
    expect(seed).toContain("Golden Creator (Phase 6 test identity)");
  });

  it("exposes no registry mutation route", async () => {
    const worker = await readFile(resolve(appRoot, "worker/index.ts"), "utf8");
    expect(worker).not.toMatch(/\/api\/(?:admin|enroll|session)/u);
    expect(worker).toContain('request.method !== "GET" && request.method !== "HEAD"');
  });
});
