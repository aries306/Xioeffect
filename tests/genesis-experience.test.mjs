import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Genesis front door is a native experience, not an iframe wrapper", async () => {
  const home = await fs.readFile("app/page.tsx", "utf8");
  const experience = await fs.readFile("components/genesis/GenesisExperience.tsx", "utf8");
  assert.match(home, /GenesisExperience/);
  assert.doesNotMatch(home, /iframe|living\.html|xyoverse-enhancer/);
  assert.match(experience, /Bring me the thought/);
  assert.match(experience, /\/api\/chat/);
  assert.match(experience, /\/api\/workspace/);
  assert.match(experience, /prefers-reduced-motion/);
});

test("Genesis chat uses the protected workspace API and surfaces evidence", async () => {
  const experience = await fs.readFile("components/genesis/GenesisExperience.tsx", "utf8");
  assert.match(experience, /workspaceId/);
  assert.match(experience, /credentials: "same-origin"/);
  assert.match(experience, /supporting context/);
  assert.match(experience, /Sign in to connect your thought/);
});
