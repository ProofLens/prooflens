import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const textExtensions = /\.(?:js|json|md|mjs|py|toml|ts|tsx|yaml|yml)$/u;
const paths = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
  encoding: "utf8"
})
  .split(/\r?\n/u)
  .filter((path) => path !== "" && !path.startsWith("legacy/") && textExtensions.test(path));
const failures = [];

for (const path of paths) {
  const bytes = await readFile(path);
  if (bytes.includes(0)) continue;
  const text = bytes.toString("utf8");
  if (!text.endsWith("\n")) failures.push(`${path}: missing final newline`);
  if (/[ \t]+(?=\r?$)/gmu.test(text)) failures.push(`${path}: trailing whitespace`);
}

if (failures.length > 0) throw new Error(`Formatting invariants failed:\n${failures.join("\n")}`);
console.log(`Checked formatting invariants for ${paths.length} tracked and pending text files.`);
