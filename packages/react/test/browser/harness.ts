import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDetachedAssetBinding, type ProofLensEnvelope } from "@prooflens/claim";
import { createDevelopmentC2paCredentials, signWithGeneratorProduct } from "@prooflens/c2pa-node";
import { generateFixtures } from "@prooflens/fixtures";
import { exportRegistryPublicJwk, generateCreatorKey, signClaim, type RegistryIdentityRecord } from "@prooflens/identity";
import { toCompactEmbeddedClaim } from "@prooflens/metadata";
import { build } from "esbuild";

export interface HarnessAssets {
  origin: string;
  corsOrigin: string;
  kid: string;
  envelope: ProofLensEnvelope;
  record: RegistryIdentityRecord;
  close: () => Promise<void>;
}

function send(response: ServerResponse, status: number, type: string, body: Buffer | string, cors = false): void {
  const headers: Record<string, string> = { "content-type": type };
  if (cors) headers["access-control-allow-origin"] = "*";
  response.writeHead(status, headers);
  response.end(body);
}

async function bundle(entry: string, absWorkingDir: string): Promise<string> {
  const result = await build({
    absWorkingDir,
    bundle: true,
    entryPoints: [entry],
    format: "iife",
    jsx: "automatic",
    platform: "browser",
    target: "es2022",
    write: false
  });
  const text = result.outputFiles?.[0]?.text;
  if (text === undefined) throw new Error(`Failed to bundle ${entry}`);
  return text;
}

function listen(handler: (request: IncomingMessage, response: ServerResponse) => void): Promise<Server> {
  const server = createServer(handler);
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

function originOf(server: Server): string {
  const { port } = server.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

export async function startHarness(): Promise<HarnessAssets> {
  const fixtures = generateFixtures();
  const jpeg = fixtures.jpeg;
  const png = fixtures.png;
  const keyPair = await generateCreatorKey();
  const kid = "https://registry.example.test/v1/keys/creator-1";
  const claim = {
    version: "1.0" as const,
    claimId: "urn:uuid:6f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    issuedAt: "2026-08-13T12:00:00.000Z",
    creatorKid: kid,
    asset: await createDetachedAssetBinding(jpeg.bytes, jpeg.filename, jpeg.mime),
    creator: {
      displayName: "Phase Four Creator",
      creditLine: "Photo: Phase Four Creator",
      caption: "A deterministic caption"
    },
    edits: [] as [],
    locators: { claim: "https://claims.example.test/v1/claim-1" }
  };
  const envelope = await signClaim(claim, keyPair.privateKey);
  const conflictingEnvelope = await signClaim({
    ...claim,
    claimId: "urn:uuid:7f9619ff-8b86-4e7f-bf84-6f3dd629e11a",
    creator: { ...claim.creator, caption: "A conflicting caption" }
  }, keyPair.privateKey);
  const record: RegistryIdentityRecord = {
    version: "1.0",
    kid,
    publicKey: await exportRegistryPublicJwk(keyPair.publicKey),
    identity: { displayName: "Phase Four Creator", reviewedAt: "2026-08-12T12:00:00.000Z" },
    status: "trusted",
    validFrom: "2026-08-13T00:00:00.000Z",
    validUntil: "2027-08-13T00:00:00.000Z",
    revocation: null
  };
  const credentials = await createDevelopmentC2paCredentials();
  const c2paSigned = await signWithGeneratorProduct(jpeg.bytes, jpeg.mime, toCompactEmbeddedClaim(claim), credentials);
  const reactDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
  const verifierDir = join(dirname(fileURLToPath(import.meta.url)), "../../../verifier");
  const [reactBundle, autoAttach] = await Promise.all([
    bundle("test/browser/react-harness.tsx", reactDir),
    bundle("src/auto-attach-bundle.ts", verifierDir)
  ]);

  const cors = await listen((_request, response) => {
    send(response, 200, "image/jpeg", Buffer.from(jpeg.bytes), false);
  });
  const corsOrigin = originOf(cors);
  const fixtureJson = JSON.stringify({
    envelope,
    conflictingEnvelope,
    record,
    now: "2026-08-13T12:01:00.000Z",
    kid,
    corsOrigin
  });

  const documentFor = (kind: "react" | "attach", scenario: string, extra: string): string => `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<title>ProofLens ${kind} ${scenario}</title>
<body>
${extra}
<script>window.__PROOFLENS_FIXTURE = ${fixtureJson}; window.__PROOFLENS_SCENARIO = ${JSON.stringify(scenario)};</script>
<script src="${kind === "react" ? "/react-harness.js" : "/prooflens-verify.js"}"></script>
</body>
</html>`;

  const attachFigure = (img: string, scriptValue: ProofLensEnvelope): string => `<figure data-prooflens-id="${scriptValue.claim.claimId}">
  ${img}
  <figcaption data-prooflens-credit="${scriptValue.claim.creator.creditLine}" data-prooflens-caption="${scriptValue.claim.creator.caption}">${scriptValue.claim.creator.creditLine}</figcaption>
  <script type="application/prooflens+json">${JSON.stringify(scriptValue)}</script>
</figure>`;

  const main = await listen((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/react-harness.js") return send(response, 200, "text/javascript", reactBundle);
    if (url.pathname === "/prooflens-verify.js") return send(response, 200, "text/javascript", autoAttach);
    if (url.pathname === "/assets/right.jpg") return send(response, 200, "image/jpeg", Buffer.from(jpeg.bytes), true);
    if (url.pathname === "/assets/c2pa.jpg") return send(response, 200, "image/jpeg", Buffer.from(c2paSigned), true);
    if (url.pathname === "/assets/wrong.png") return send(response, 200, "image/png", Buffer.from(png.bytes), true);
    if (url.pathname === "/assets/envelope.json") return send(response, 200, "application/json", JSON.stringify(envelope), true);
    if (url.pathname === "/assets/conflict.json") return send(response, 200, "application/json", JSON.stringify(conflictingEnvelope), true);
    if (url.pathname.startsWith("/react/")) {
      return send(response, 200, "text/html; charset=utf-8", documentFor("react", url.pathname.slice("/react/".length), ""));
    }
    if (url.pathname.startsWith("/attach/")) {
      const scenario = url.pathname.slice("/attach/".length);
      const extra = scenario === "conflict"
        ? attachFigure(
          `<img src="/assets/right.jpg" alt="conflict" data-prooflens-envelope-url="/assets/envelope.json">`,
          conflictingEnvelope
        )
        : scenario === "current-src"
          ? attachFigure(
            `<img src="/assets/wrong.png" srcset="/assets/right.jpg 1x" alt="currentSrc" data-prooflens-envelope-url="/assets/envelope.json">`,
            envelope
          )
          : scenario === "cors"
            ? attachFigure(
              `<img src="${corsOrigin}/blocked.jpg" alt="cors" crossorigin="anonymous" data-prooflens-envelope-url="/assets/envelope.json">`,
              envelope
            )
            : scenario === "c2pa"
              ? `<figure><img src="/assets/c2pa.jpg" alt="c2pa"><figcaption>C2PA only</figcaption></figure>`
              : attachFigure(
                `<img src="/assets/right.jpg" alt="trusted" data-prooflens-envelope-url="/assets/envelope.json">`,
                envelope
              );
      return send(response, 200, "text/html; charset=utf-8", documentFor("attach", scenario, extra));
    }
    send(response, 404, "text/plain", "not found");
  });

  return {
    origin: originOf(main),
    corsOrigin,
    kid,
    envelope,
    record,
    async close() {
      await Promise.all([
        new Promise<void>((resolve, reject) => main.close((error) => error ? reject(error) : resolve())),
        new Promise<void>((resolve, reject) => cors.close((error) => error ? reject(error) : resolve()))
      ]);
    }
  };
}
