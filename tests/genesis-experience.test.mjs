import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("Exelta front door is a native bright 3D arrival experience", async () => {
  const home = await fs.readFile("app/page.tsx", "utf8");
  const experience = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  const styles = await fs.readFile("app/zuna-arrival.css", "utf8");
  assert.match(home, /ZunaArrivalExperience/);
  assert.match(home, /force-static/);
  assert.doesNotMatch(home, /auth\(/);
  assert.doesNotMatch(home, /iframe|living\.html|xyoverse-enhancer/);
  assert.match(experience, /YOUR FIRST FIVE MINUTES/);
  assert.match(experience, /zuna-onboarding-draft/); // compatibility key; not user-facing
  assert.match(experience, /Create your Exelta space & save/);
  assert.match(experience, /Oh… there you are/);
  assert.match(experience, /\/api\/chat/);
  assert.match(experience, /\/api\/workspace/);
  assert.match(experience, /\/api\/memory/);
  assert.match(experience, /prefers-reduced-motion/);
  assert.match(styles, /perspective/);
  assert.match(styles, /color-scheme:light/);
  const atlasStyles = await fs.readFile("app/atlas/atlas.css", "utf8");
  const sanctumStyles = await fs.readFile("app/sanctum/sanctum.css", "utf8");
  const workspaceStyles = await fs.readFile("app/genesis.css", "utf8");
  assert.match(atlasStyles, /--atlas-bg:\s*#0B1020/i);
  assert.match(atlasStyles, /--atlas-violet:\s*#7C5CFF/i);
  assert.match(sanctumStyles, /--violet:#7C5CFF/i);
  assert.match(sanctumStyles, /#0B1020/i);
  assert.match(workspaceStyles, /--gen-violet:#7C5CFF/i);
  assert.match(workspaceStyles, /--gen-bg:#0B1020/i);
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

test("both Exelta experiences use the unified identity", async () => {
  const arrival = await fs.readFile("components/genesis/ZunaArrivalExperience.tsx", "utf8");
  const atlas = await fs.readFile("components/atlas/ZunaAtlasExperience.tsx", "utf8");
  const workspace = await fs.readFile("components/genesis/GenesisExperience.tsx", "utf8");
  assert.match(arrival, /EXELTA IS HERE/);
  assert.match(arrival, /I'm Exelta/);
  assert.match(atlas, /Talk to EXelta/i);
  assert.match(atlas, /EXELTA SYSTEM ATLAS/);
  assert.match(workspace, /RESPONSE FROM EXELTA/);
  assert.match(workspace, /Exelta living universe/);
  assert.doesNotMatch(atlas, /<strong>XIO|XIO SYSTEM ATLAS|XIO’s cognitive|XIO intelligence|XIO home/);
  assert.doesNotMatch(workspace, /<strong>XIO|XIO Genesis home|XIO living universe/);
  assert.doesNotMatch(arrival, /\bVea\b/);
});
