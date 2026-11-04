import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const read = (path) => fs.readFile(path, "utf8");

test("Memory Fabric keeps evidence distinct from reasoning", async () => {
  const memory = await read("lib/memory.ts");
  const astara = await read("lib/astara.ts");
  assert.match(memory, /provenance/);
  assert.match(memory, /lifecycle_state/);
  assert.match(memory, /relevance/);
  assert.match(memory, /scope/);
  assert.match(memory, /dormant.*review|review.*dormant/s);
  assert.match(astara, /contextual evidence/);
  assert.match(astara, /recommendation/);
});

test("Workspace enforces authenticated role boundaries", async () => {
  const workspace = await read("lib/workspace.ts");
  assert.match(workspace, /requireUser/);
  assert.match(workspace, /workspace_members/);
  assert.match(workspace, /WorkspaceRole/);
  assert.match(workspace, /ROLE_RANK/);
  assert.match(workspace, /getAuthorizedWorkspace\(workspaceId, "editor"\)/);
  assert.match(workspace, /Account identity conflict/);
});

test("Astara authorizes writes before running", async () => {
  const astara = await read("lib/astara.ts");
  assert.match(astara, /getAuthorizedWorkspace\(input\.workspaceId, "editor"\)/);
  const historyIndex = astara.indexOf("select role, content");
  const insertIndex = astara.indexOf("insert into messages");
  assert.ok(historyIndex >= 0 && insertIndex > historyIndex);
});

test("Feedback updates lifecycle and records provenance history", async () => {
  const memory = await read("lib/memory.ts");
  const feedback = await read("app/api/feedback/route.ts");
  assert.match(memory, /memory_feedback/);
  assert.match(memory, /memory_events/);
  assert.match(memory, /reactivated/);
  assert.match(memory, /getAuthorizedWorkspace\(input\.workspaceId, "editor"\)/);
  assert.match(feedback, /recommendation_outcomes/);
  assert.match(feedback, /write access/);
});

test("Memory lifecycle supports contextual re-evaluation and explicit archive/edit controls", async () => {
  const memory = await read("lib/memory.ts");
  const route = await read("app/api/memory/route.ts");
  const migration = await read("db/migrations/004_memory_lifecycle_controls.sql");
  const feedbackMigration = await read("db/migrations/005_memory_feedback_lifecycle_controls.sql");
  assert.match(memory, /"review"/);
  assert.match(memory, /"invalidated"/);
  assert.match(memory, /"archived"/);
  assert.match(memory, /lifecycle_state in \('active','dormant','review'\)/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
  assert.match(migration, /memories_lifecycle_state_check/);
  assert.match(feedbackMigration, /memory_feedback_signal_check/);
  assert.match(feedbackMigration, /\x27review\x27/);
  assert.match(feedbackMigration, /\x27invalidate\x27/);
  assert.match(feedbackMigration, /\x27archive\x27/);
});

test("Stale active memories transition to dormant without entering reasoning", async () => {
  const memory = await read("lib/memory.ts");
  const evaluator = await read("app/api/memory/evaluate/route.ts");
  const migration = await read("db/migrations/007_stale_memory_dormancy.sql");
  assert.match(memory, /evaluation.status === "stale"/);
  assert.match(memory, /stale_without_recent_confirmation/);
  assert.match(memory, /set lifecycle_state='dormant'/);
  assert.match(evaluator, /set lifecycle_state='dormant'/);
  assert.match(evaluator, /lifecycleAfter = "dormant"/);
  assert.match(migration, /'dormant'/);
});

test("Sanctum displays the actual evaluated Memory Fabric state", async () => {
  const sanctum = await read("components/sanctum/SanctumExperience.tsx");
  const evaluator = await read("app/api/memory/evaluate/route.ts");
  assert.match(sanctum, /\/api\/memory\/evaluate/);
  assert.match(sanctum, /context:\{context:"personal"\}/);
  assert.match(sanctum, /evaluation\??\.eligible/);
  assert.match(sanctum, /influenceWeight/);
  assert.match(sanctum, /not a belief, pattern, insight, or recommendation/);
  assert.match(evaluator, /getAuthorizedWorkspace\(parsed\.data\.workspaceId, "editor"\)/);
  assert.match(evaluator, /evaluateMemoryForContext/);
  assert.match(evaluator, /last_evaluated_at/);
  assert.match(evaluator, /'evaluated'/);
  assert.match(evaluator, /findContradictionCandidates/);
  assert.match(evaluator, /potentialConflicts/);
  assert.match(sanctum, /Confirm contradiction/);
});

test("Explicit contradiction feedback is atomic and quarantines both memories", async () => {
  const memory = await read("lib/memory.ts");
  assert.match(memory, /sql\.begin\(async \(tx\)/);
  assert.match(memory, /lifecycle = "review"/);
  assert.match(memory, /lifecycle_state='review',active=true/);
  assert.match(memory, /'contradicts'/);
  assert.match(memory, /A memory cannot contradict itself/);
});

test("Chat memory writes and search preserve semantic context scope", async () => {
  const chat = await read("app/api/chat/route.ts");
  const memoryRoute = await read("app/api/memory/route.ts");
  const browserChat = await read("public/js/chat.js");
  assert.match(chat, /scope: \{ originContext: memoryContext \}/);
  assert.match(chat, /originContext: memoryContext/);
  assert.match(memoryRoute, /url\.searchParams\.get\("context"\)/);
  assert.match(memoryRoute, /retrieveContextualMemories\(String\(workspace\.id\), query, \{ context \}/);
  assert.match(browserChat, /scope:\{originContext:"personal"\}/);
});

test("Health and privacy endpoints are implemented instead of stubs", async () => {
  const health = await read("app/api/health/route.ts");
  const exportRoute = await read("app/api/account/export/route.ts");
  const deleteRoute = await read("app/api/account/delete/route.ts");
  assert.match(health, /database/);
  assert.match(health, /memoryFabric/);
  assert.match(health, /memory_relations/);
  assert.match(health, /Cache-Control/);
  assert.doesNotMatch(exportRoute, /not configured/);
  assert.match(exportRoute, /token material|github_connections/);
  assert.match(exportRoute, /memoryFabric: \{ events: memoryEvents, feedback: memoryFeedback, relations: memoryRelations \}/);
  assert.match(exportRoute, /last_evaluated_at, evaluation from memories/);
  assert.doesNotMatch(deleteRoute, /not configured/);
  assert.match(deleteRoute, /confirm !== "DELETE"/);
});

test("Staging database fails closed instead of using in-memory mock storage", async () => {
  const database = await read("lib/db.ts");
  assert.match(database, /env\.HYPERDRIVE\?\.connectionString/);
  assert.match(database, /env as typeof env & \{ APP_ENV\?: string \}/);
  assert.match(database, /process\.env\.APP_ENV/);
  assert.match(database, /appEnv === "production" \|\| appEnv === "staging"/);
  assert.match(database, /staging database is not configured/);
  assert.match(database, /refusing to fall back to in-memory mock storage/);
});
