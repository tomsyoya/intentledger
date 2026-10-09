import test from "node:test";
import assert from "node:assert/strict";
import { readFile, access } from "node:fs/promises";
import { resolve } from "node:path";

test("pages_production_assets_resolve_under_repository_subpath", async () => {
  const html = await readFile("dist/index.html", "utf8");
  const paths = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(
    paths.some((path) => path.includes("assets/") && path.endsWith(".js")),
  );
  assert.ok(
    paths.some((path) => path.includes("assets/") && path.endsWith(".css")),
  );
  for (const path of paths) {
    assert.ok(path.startsWith("./"), `Asset must be relative: ${path}`);
    const url = new URL(path, "https://example.github.io/intentledger/");
    assert.ok(url.pathname.startsWith("/intentledger/"));
    await access(resolve("dist", path));
  }
  assert.ok(
    !html.includes("/src/"),
    "Production HTML must not reference source files",
  );
});
