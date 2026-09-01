import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const pkg = join(dirname(fileURLToPath(import.meta.url)), "..");

await build({
  absWorkingDir: pkg,
  bundle: true,
  entryPoints: ["src/auto-attach-bundle.ts"],
  format: "iife",
  globalName: "ProofLensBundle",
  outfile: "dist/prooflens-verify.js",
  platform: "browser",
  target: "es2022"
});

await build({
  absWorkingDir: pkg,
  bundle: true,
  entryPoints: ["src/auto-attach-bundle.ts"],
  format: "iife",
  globalName: "ProofLensBundle",
  minify: true,
  outfile: "dist/prooflens-verify.min.js",
  platform: "browser",
  target: "es2022"
});
