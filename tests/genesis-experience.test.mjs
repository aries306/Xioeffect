import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("XIO front door is a native bright 3D arrival experience", async () => {
  const home = await fs.readFile("app/page.tsx", "utf8");
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  const styles = await fs.readFile("app/zuna-arrival.css", "utf8");
  assert.match(home, /ZunaArrivalExperience/);
  assert.match(home, /force-static/);
  assert.doesNotMatch(home, /auth\(/);
  assert.doesNotMatch(home, /iframe|living\.html|xyoverse-enhancer/);
  assert.match(experience, /YOUR FIRST FIVE MINUTES/);
  assert.match(experience, /zuna-onboarding-draft/);
  assert.match(experience, /Create your XIO space & save/);
  assert.match(experience, /Oh… there you are/);
  assert.match(experience, /\/api\/chat/);
  assert.match(experience, /\/api\/workspace/);
  assert.match(experience, /\/api\/memory/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(styles, /perspective/);
  assert.match(styles, /color-scheme:light/);
});

test("five-minute onboarding persists user-provided context with provenance and consent", async () => {
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  assert.match(experience, /explicit-user-submission/);
  assert.match(experience, /zuna-five-minute-onboarding/);
  assert.match(experience, /category: "personal_context"/);
  assert.match(experience, /category: "goal"/);
  assert.match(experience, /workspaceId: workspace\.id/);
  assert.match(experience, /credentials: "same-origin"/);
  assert.match(experience, /memoryCount: memoryResults\.length/);
  assert.match(experience, /checked=\{consent\}/);
});

test("EXelta is the user-facing AI while XIO remains the product", async () => {
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  const atlas = await fs.readFile("components/atlas/ZunaAtlasExperience.tsx", "utf8");
  const workspace = await fs.readFile("components/genesis/GenesisExperience.tsx", "utf8");
  const layout = await fs.readFile("app/layout.tsx", "utf8");
  const site = await fs.readFile("site/index.html", "utf8");
  assert.match(experience, /<strong>XIO<\/strong>/);
  assert.match(experience, /I'm Exelta/);
  assert.match(experience, /EXELTA IS HERE/);
  assert.match(atlas, /Talk to EXelta/);
  assert.match(workspace, /RESPONSE FROM EXELTA/);
  assert.match(workspace, /XIO living universe/);
  assert.match(layout, /applicationName: "XIO"/);
  assert.match(site, /Zio Effect/);
  assert.match(site, /XIO and Zioren remain distinct product experiences/);
  assert.doesNotMatch(site, /Exelta Effect/);
});
