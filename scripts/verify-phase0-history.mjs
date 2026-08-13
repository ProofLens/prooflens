#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const imports = {
  signer: {
    final: "20e248ac2de56bc49a60478c315ba6baf378fd4f",
    representative: "7b75342c28c85164c179b508f81b6079e8d769ee",
    path: "legacy/signer",
    rollback: "refs/tags/rollback/signer/final-standalone",
    release: ["refs/tags/standalone/signer/v0.1.0", "44c8e6230e215195554f45ab5282c590004733d3"],
  },
  "verify-widget": {
    final: "46bb79519fddc925fee6f856b98e987f444d819e",
    representative: "1ceb8554f4dcfd09f5dcac5136f9df6ce2f86fc3",
    path: "legacy/verify-widget",
    rollback: "refs/tags/rollback/verify-widget/final-standalone",
    release: ["refs/tags/standalone/verify-widget/v0.1.0", "8fd6b9288f324ff17f246126ac981efaa19d45ac"],
  },
};
const licenseSha256 = "5639963e2ba5c4c9c5233dff729cad06775fab625fb1510cec4ebe850b4493d0";
const failures = [];

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function commit(ref) {
  return git("rev-parse", `${ref}^{commit}`);
}

function check(condition, message) {
  console.log(`${condition ? "PASS" : "FAIL"}: ${message}`);
  if (!condition) failures.push(message);
}

const head = commit("HEAD");
for (const [name, item] of Object.entries(imports)) {
  for (const [label, oid] of [["final", item.final], ["representative", item.representative]]) {
    let reachable = false;
    try {
      reachable = commit(oid) === oid &&
        spawnSync("git", ["merge-base", "--is-ancestor", oid, head], { cwd: root }).status === 0;
    } catch {
      reachable = false;
    }
    check(reachable, `${name} ${label} commit is reachable from HEAD`);
  }

  let rollbackOk = false;
  let releaseOk = false;
  try { rollbackOk = commit(item.rollback) === item.final; } catch {}
  try { releaseOk = commit(item.release[0]) === item.release[1]; } catch {}
  check(rollbackOk, `${name} rollback reference resolves to its final commit`);
  check(releaseOk, `${name} namespaced release tag preserves v0.1.0`);

  const importedPath = join(root, item.path);
  const licensePath = join(importedPath, "LICENSE");
  check(existsSync(importedPath), `${item.path} exists`);
  const licenseOk = existsSync(licensePath) &&
    createHash("sha256").update(readFileSync(licensePath)).digest("hex") === licenseSha256;
  check(licenseOk, `${item.path}/LICENSE is preserved`);
  check(git("log", "--format=%H", "--", item.path).length > 0, `${item.path} has canonical path history`);
}

if (failures.length > 0) {
  console.error(`\nPhase 0 history verification failed (${failures.length} check(s)).`);
  process.exit(1);
}
console.log("\nPhase 0 history verification passed.");
