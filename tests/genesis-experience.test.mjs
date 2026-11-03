import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Zuna front door is a native bright 3D arrival experience", async () => {
  const home = await fs.readFile("app/page.tsx", "utf8");
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  const styles = await fs.readFile("app/zuna-arrival.css", "utf8");
  assert.match(home, /ZunaArrivalExperience/);
  assert.match(home, /force-static/);
  assert.doesNotMatch(home, /auth\(/);
  assert.doesNotMatch(home, /iframe|living\.html|xyoverse-enhancer/);
  assert.match(experience, /YOUR FIRST FIVE MINUTES/);
  assert.match(experience, /zuna-onboarding-draft/);
  assert.match(experience, /Create private space & save/);
  assert.match(experience, /Oh… there you are/);
  assert.match(experience, /\/api\/chat/);
  assert.match(experience, /\/api\/workspace/);
  assert.match(experience, /\/api\/memory/);
  assert.match(experience, /prefers-reduced-motion/);
  assert.match(styles, /perspective/);
  assert.match(styles, /color-scheme:light/);
});

test("Five-minute onboarding persists user-provided context with provenance", async () => {
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  assert.match(experience, /explicit-user-submission/);
  assert.match(experience, /zuna-five-minute-onboarding/);
  assert.match(experience, /category: "personal_context"/);
  assert.match(experience, /category: "goal"/);
  assert.match(experience, /workspaceId: workspace.id/);
  assert.match(experience, /credentials: "same-origin"/);
  assert.match(experience, /memoryCount: memoryResults.length/);
});

test("The onboarding concept field is derived from visitor-provided words", async () => {
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  assert.match(experience, /extractConcepts\(introduction\)/);
  assert.match(experience, /Concepts from your introduction/);
});

test("the arrival names EXelta as the user-facing intelligence", async () => {
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  const atlas = await fs.readFile("components/atlas/ZunaAtlasExperience.tsx", "utf8");
  assert.match(experience, /EXelta/);
  assert.match(experience, /EXELTA IS HERE/);
  assert.match(atlas, /Talk to EXelta/);
  assert.doesNotMatch(experience, /\bVea\b/);
});
