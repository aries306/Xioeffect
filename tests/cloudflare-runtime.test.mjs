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
  assert.ok(pkg.scripts["deploy:cloudflare"].includes("wrangler deploy"));
  assert.equal(worker.name, "zuna");
  assert.equal(worker.ai.binding, "AI");
  assert.equal(worker.vars.APP_ENV, "production");
  assert.ok(ai.includes("@cf/zai-org/glm-4.7-flash"));
  assert.ok(!ai.includes("vercel.sh") && !ai.includes("AI_GATEWAY_API_KEY"));
  assert.ok(!nextConfig.includes("living.html") && !nextConfig.includes("standalone"));
});

test("Cloudflare Worker routes Neon through Hyperdrive and retains local DATABASE_URL support", async () => {
  const db = await fs.readFile("lib/db.ts", "utf8");
  const worker = await fs.readFile("worker/index.ts", "utf8");
  const health = await fs.readFile("app/api/health/route.ts", "utf8");
  assert.ok(db.includes("env.HYPERDRIVE?.connectionString"));
  assert.ok(db.includes("process.env.DATABASE_URL"));
  assert.ok(worker.includes("handler.fetch"));
  assert.ok(health.includes("workersAi: env.AI"));
  assert.ok(health.includes("const sql = db()"));
  assert.ok(health.includes("workersAi: env.AI ? \"configured\" : \"missing\""));
  assert.ok(!health.includes("if (process.env.DATABASE_URL)"));
  assert.ok(!health.includes("AI_GATEWAY_API_KEY"));
});
