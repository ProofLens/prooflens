import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { createDevelopmentC2paCredentials, signWithGeneratorProduct, verifyC2paWithNode } from "@prooflens/c2pa-node";
import {
  createDetachedAssetBinding,
  parseClaim,
  parseEnvelope,
  type AssetMime,
  type ProofLensClaim
} from "@prooflens/claim";
import {
  generateStoredCreatorKey,
  parseRegistryRecord,
  signClaimWithStoredKey
} from "@prooflens/identity";
import { detectAssetMime, toCompactEmbeddedClaim } from "@prooflens/metadata";
import { verifyAsset, type VerificationReport } from "@prooflens/verifier";

export class CliError extends Error {
  readonly exitCode: number;
  constructor(message: string, exitCode = 1) {
    super(message);
    this.exitCode = exitCode;
  }
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new CliError(`${name} requires a value`);
  return value;
}

function requireFlag(args: string[], name: string): string {
  const value = flag(args, name);
  if (value === undefined) throw new CliError(`${name} is required`);
  return value;
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown;
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function mimeOf(bytes: Uint8Array, filename: string): AssetMime {
  try {
    return detectAssetMime(bytes);
  } catch {
    if (filename.endsWith(".png")) return "image/png";
    if (filename.endsWith(".webp")) return "image/webp";
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) return "image/jpeg";
    throw new CliError("Unsupported asset type");
  }
}

export async function identityGenerate(outDir: string): Promise<void> {
  const stored = await generateStoredCreatorKey();
  await mkdir(outDir, { recursive: true });
  await writeJson(join(outDir, "creator.private.jwk.json"), stored.privateJwk);
  await writeJson(join(outDir, "creator.public.jwk.json"), stored.publicJwk);
}

export async function identitySign(args: string[]): Promise<VerificationReport | ProofLensClaim> {
  const keyPath = requireFlag(args, "--key");
  const assetPath = requireFlag(args, "--asset");
  const outPath = requireFlag(args, "--out");
  const kid = requireFlag(args, "--kid");
  const bytes = new Uint8Array(await readFile(assetPath));
  const filename = flag(args, "--filename") ?? basename(assetPath);
  const mime = mimeOf(bytes, filename);
  const claim: ProofLensClaim = {
    version: "1.0",
    claimId: flag(args, "--claim-id") ?? "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: flag(args, "--issued-at") ?? new Date().toISOString(),
    creatorKid: kid,
    asset: await createDetachedAssetBinding(bytes, filename, mime),
    creator: {
      displayName: requireFlag(args, "--name"),
      creditLine: requireFlag(args, "--credit"),
      caption: flag(args, "--caption") ?? ""
    },
    edits: [],
    locators: {}
  };
  const locator = flag(args, "--claim-locator");
  if (locator !== undefined) claim.locators = { claim: locator };
  const envelope = await signClaimWithStoredKey(claim, await readJson(keyPath));
  await writeJson(outPath, envelope);
  return envelope.claim;
}

export async function c2paSign(args: string[]): Promise<void> {
  if (args.includes("--key") || args.includes("--identity-key") || args.includes("--creator-key")) {
    throw new CliError("C2PA signing uses Generator Product credentials only; do not pass a creator identity key");
  }
  const assetPath = requireFlag(args, "--asset");
  const claimPath = requireFlag(args, "--claim");
  const outPath = requireFlag(args, "--out");
  const bytes = new Uint8Array(await readFile(assetPath));
  const mime = mimeOf(bytes, basename(assetPath));
  const claimValue = await readJson(claimPath);
  const envelope = typeof claimValue === "object" && claimValue !== null && "claim" in claimValue && "signature" in claimValue
    ? parseEnvelope(claimValue)
    : undefined;
  const compact = envelope === undefined
    ? toCompactEmbeddedClaim(parseClaim(claimValue))
    : toCompactEmbeddedClaim(envelope.claim);
  const credentials = await createDevelopmentC2paCredentials();
  const signed = await signWithGeneratorProduct(bytes, mime, compact, credentials);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, signed);
}

export async function verifyCommand(args: string[]): Promise<VerificationReport> {
  const assetPath = requireFlag(args, "--asset");
  const bytes = new Uint8Array(await readFile(assetPath));
  const mime = mimeOf(bytes, basename(assetPath));
  const envelopePath = flag(args, "--envelope");
  const registryPath = flag(args, "--registry");
  const htmlPath = flag(args, "--html");
  const legacyPath = flag(args, "--legacy");
  const report = await verifyAsset({
    bytes,
    mime,
    verifyC2pa: verifyC2paWithNode,
    ...(envelopePath === undefined ? {} : { detachedEnvelope: await readJson(envelopePath) }),
    ...(registryPath === undefined ? {} : { registryRecord: parseRegistryRecord(await readJson(registryPath)) }),
    ...(htmlPath === undefined ? {} : { html: await readFile(htmlPath, "utf8") }),
    ...(legacyPath === undefined ? {} : { legacyManifest: await readJson(legacyPath) })
  });
  return report;
}

export async function runCli(argv: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  const args = argv.slice(2);
  const command = args[0];
  const sub = args[1];
  try {
    if (command === "identity" && sub === "generate") {
      await identityGenerate(requireFlag(args, "--out"));
      return { code: 0, stdout: "Wrote creator identity JWKs. These keys must not be used for C2PA signing.\n", stderr: "" };
    }
    if (command === "identity" && sub === "sign") {
      await identitySign(args);
      return { code: 0, stdout: "Wrote ProofLens creator envelope.\n", stderr: "" };
    }
    if (command === "c2pa" && sub === "sign") {
      await c2paSign(args);
      return { code: 0, stdout: "Wrote C2PA-signed asset using development/test Generator Product credentials.\n", stderr: "" };
    }
    if (command === "verify") {
      const report = await verifyCommand(args);
      return { code: 0, stdout: `${JSON.stringify(report, null, 2)}\n`, stderr: "" };
    }
    throw new CliError(`Usage:
  prooflens identity generate --out <dir>
  prooflens identity sign --key <private.jwk.json> --asset <file> --kid <https-kid> --name <name> --credit <credit> --out <envelope.json>
  prooflens c2pa sign --asset <file> --claim <envelope-or-claim.json> --out <file>
  prooflens verify --asset <file> [--envelope <file>] [--registry <file>] [--html <file>] [--legacy <file>]`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const code = error instanceof CliError ? error.exitCode : 1;
    return { code, stdout: "", stderr: `${message}\n` };
  }
}
