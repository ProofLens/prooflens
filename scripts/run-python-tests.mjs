import { spawnSync } from "node:child_process";

const candidates = [
  process.env.PROOFLENS_PYTHON,
  "python3",
  "python",
  "py"
].filter(Boolean);

for (const executable of candidates) {
  const prefix = executable === "py" ? ["-3"] : [];
  const probe = spawnSync(executable, [...prefix, "--version"], { encoding: "utf8" });
  if (probe.error?.code === "ENOENT" || probe.status !== 0) continue;
  const args = executable === "py"
    ? ["-3", "-m", "unittest", "discover", "-s", "packages/python/tests", "-v"]
    : ["-m", "unittest", "discover", "-s", "packages/python/tests", "-v"];
  const result = spawnSync(executable, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PYTHONPATH: ["packages/python/src", process.env.PYTHONPATH].filter(Boolean).join(process.platform === "win32" ? ";" : ":")
    },
    encoding: "utf8",
    stdio: "inherit"
  });
  if (result.status === 0) process.exit(0);
  process.exit(result.status ?? 1);
}

console.error("No usable Python 3 runtime found. Set PROOFLENS_PYTHON to an explicit executable.");
process.exit(1);
