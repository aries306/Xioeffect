import assert from "node:assert/strict";
import fs from "node:fs";

const path = new URL("../dist/server/wrangler.json", import.meta.url);
assert.ok(fs.existsSync(path), "Cloudflare Vite build output must contain its generated Wrangler config");
const config = JSON.parse(fs.readFileSync(path, "utf8"));
const hyperdrive = config.hyperdrive?.find((binding) => binding.binding === "HYPERDRIVE");

assert.equal(config.name, "exelta-staging", "build output must target only the isolated staging Worker");
assert.equal(config.vars?.APP_ENV, "staging", "build output must set APP_ENV=staging");
assert.equal(config.vars?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, "pk_test_YmVsb3ZlZC1pbXBhbGEtNjgzMS5jbGVyay5hY2NvdW50cy5kZXYk", "build output must use the Exelta Staging Clerk key");
assert.equal(hyperdrive?.id, "6b65f8e46ab34ec39b87abd9fdbf5636", "build output must use the isolated staging Hyperdrive");
assert.equal(config.env, undefined, "generated config must be flattened for the selected Cloudflare environment");
assert.doesNotMatch(JSON.stringify(config), /21a940560ded47ea8f0ed10eda49dbe9/, "production Hyperdrive must not appear in staging build output");

process.stdout.write("Generated deployment config targets only exelta-staging and its isolated Hyperdrive.\n");
