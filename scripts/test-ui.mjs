import { build } from "esbuild";
import { spawnSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
mkdirSync(".test-build", { recursive: true });
try {
  await build({
    entryPoints: ["tests/ui.test.tsx"],
    outfile: ".test-build/ui.test.mjs",
    bundle: true,
    platform: "node",
    format: "esm",
    packages: "external",
    jsx: "automatic",
  });
  const result = spawnSync(
    process.execPath,
    ["--test", ".test-build/ui.test.mjs"],
    { stdio: "inherit" },
  );
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(".test-build", { recursive: true, force: true });
}
