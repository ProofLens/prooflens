import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { AssetMime } from "@prooflens/claim";
import { build } from "esbuild";
import { chromium, type Browser, type Page } from "playwright";
import { evaluateC2paEvidence } from "../src/evidence.js";
import type { C2paEvidence } from "../src/types.js";

export interface WebC2paSession {
  verify: (bytes: Uint8Array, mime: AssetMime) => Promise<C2paEvidence>;
  close: () => Promise<void>;
}

async function bundleHarness(): Promise<string> {
  const result = await build({
    absWorkingDir: join(dirname(fileURLToPath(import.meta.url)), ".."),
    bundle: true,
    entryPoints: ["test/web-harness-entry.ts"],
    format: "iife",
    platform: "browser",
    target: "es2022",
    write: false
  });
  const output = result.outputFiles?.[0]?.text;
  if (output === undefined) throw new Error("Failed to bundle the C2PA web harness");
  return output;
}

export async function startWebC2paSession(): Promise<WebC2paSession> {
  const harness = await bundleHarness();
  const html = `<!doctype html><meta charset="utf-8"><script>${harness}</script>`;
  const server: Server = createServer((_request, response) => {
    response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    response.end(html);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const browser: Browser = await chromium.launch();
  const page: Page = await browser.newPage();
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(String(error)));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${port}/`);
  try {
    await page.waitForFunction(() => typeof (globalThis as { __c2paVerify?: unknown }).__c2paVerify === "function");
  } catch (error) {
    throw new Error(`C2PA web harness failed to load: ${failures.join("; ") || String(error)}`, { cause: error });
  }
  return {
    async verify(bytes, mime) {
      const store = await page.evaluate(async ({ b64, type }) => {
        return await (globalThis as unknown as { __c2paVerify: (b64: string, type: string) => Promise<unknown> }).__c2paVerify(b64, type);
      }, { b64: Buffer.from(bytes).toString("base64"), type: mime });
      return evaluateC2paEvidence(store);
    },
    async close() {
      await browser.close();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  };
}
