import assert from "node:assert/strict";
import fs from "node:fs";

const config = JSON.parse(fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
const staging = config.env?.staging;
const productionHyperdrive = config.hyperdrive?.find((binding) => binding.binding === "HYPERDRIVE");
const stagingHyperdrive = staging?.hyperdrive?.find((binding) => binding.binding === "HYPERDRIVE");

assert.equal(staging?.name, "exelta-staging", "staging Worker must use its isolated script name");
assert.equal(staging?.vars?.APP_ENV, "staging", "staging must set APP_ENV=staging");
assert.equal(staging?.vars?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, "pk_test_YmVsb3ZlZC1pbXBhbGEtNjgzMS5jbGVyay5hY2NvdW50cy5kZXYk", "staging must use the separate Exelta Staging Clerk publishable key");
assert.match(staging?.vars?.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "", /^pk_test_/, "staging Clerk publishable key must be a test key");
assert.equal(stagingHyperdrive?.id, "6b65f8e46ab34ec39b87abd9fdbf5636", "staging must use the isolated Exelta Hyperdrive");
assert.ok(productionHyperdrive?.id, "production Hyperdrive binding must remain configured");
assert.notEqual(stagingHyperdrive?.id, productionHyperdrive?.id, "staging must never reuse the production Hyperdrive");
assert.equal(staging?.ai?.binding, "AI", "staging must bind Workers AI explicitly");
assert.equal(config.preview_urls, false, "automatic preview URLs must remain disabled until authenticated staging is ready");

const serialized = JSON.stringify(config);
assert.doesNotMatch(serialized, /CLERK_SECRET_KEY|STAGING_CLERK_TEST_COOKIE|postgres(?:ql)?:\/\/[^\s]+:[^\s]+@/i, "Wrangler config must not contain secrets or database credentials");

process.stdout.write("Staging configuration is isolated; Clerk public key is the staging test key; production binding is preserved; no credentials are embedded.\n");
