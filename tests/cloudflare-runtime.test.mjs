import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

 test("Cloudflare is the primary deployment target and Workers AI replaces Vercel Gateway", async () => {
  const pkg = JSON.parse(await fs.readFile("package.json", "utf8"));
  const worker = JSON.parse(await fs.readFile("wrangler.jsonc", "utf8"));
  const ai = await fs.readFile("lib/ai.ts", "utf8");
  const nextConfig = await fs.readFile("next.config.ts", "utf8");
  assert.equal(pkg.scripts.dev, "vinext dev");
  assert.equal(pkg.scripts.build, "vinext build");
  assert.match(pkg.scripts["deploy:cloudflare"], /@vinext\\/cloudflare deploy/);
  assert.equal(worker.name, "zuna");
  assert.equal(worker.ai.binding, "AI");
  assert.match(ai, /@cf\\/zai-org\\/glm-4\\.7-flash/);
  assert.doesNotMatch(ai, /vercel\\.sh|AI_GATEWAY_API_KEY/);
  assert.doesNotMatch(nextConfig, /living\\.html|standalone/);
});

test("Cloudflare runtime uses Hyperdrive when bound and keeps local Neon fallback", async () => {
  const db = await fs.readFile("lib/db.ts", "utf8");
  assert.match(db, /env\\.HYPERDRIVE\\?\\.connectionString/);
  assert.match(db, /process\\.env\\.DATABASE_URL/);
  assert.match(db, /application_name: hyperdriveUrl/);
});
