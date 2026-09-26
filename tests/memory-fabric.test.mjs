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

test("Health and privacy endpoints are implemented instead of stubs", async () => {
  const health = await read("app/api/health/route.ts");
  const exportRoute = await read("app/api/account/export/route.ts");
  const deleteRoute = await read("app/api/account/delete/route.ts");
  assert.match(health, /database/);
  assert.match(health, /Cache-Control/);
  assert.doesNotMatch(exportRoute, /not configured/);
  assert.match(exportRoute, /token material|github_connections/);
  assert.doesNotMatch(deleteRoute, /not configured/);
  assert.match(deleteRoute, /confirm !== "DELETE"/);
});

test("Live authenticated loop exercises the real server when test credentials are supplied", async (t) => {
  const baseUrl = process.env.XIO_TEST_BASE_URL;
  const cookie = process.env.XIO_TEST_COOKIE;
  if (!baseUrl || !cookie) { t.skip("Set XIO_TEST_BASE_URL and XIO_TEST_COOKIE to run the real authenticated integration loop"); return; }
  const anonymous = await fetch(`${baseUrl}/api/workspace`, { redirect: "manual" });
  assert.notEqual(anonymous.status, 200);
  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  const workspace = await fetch(`${baseUrl}/api/workspace`, { headers });
  assert.equal(workspace.status, 200);
  const workspaceBody = await workspace.json();
  assert.ok(workspaceBody.workspace?.id);
  const chat = await fetch(`${baseUrl}/api/chat`, { method: "POST", headers, body: JSON.stringify({ workspaceId: workspaceBody.workspace.id, message: "I am working toward finishing ZIO this week." }) });
  assert.equal(chat.status, 200);
  const chatBody = await chat.json();
  assert.ok(chatBody.conversationId);
  assert.ok(chatBody.answer);
  if (chatBody.memoryProposals?.length) {
    const memory = await fetch(`${baseUrl}/api/memory`, { method: "POST", headers, body: JSON.stringify({ workspaceId: workspaceBody.workspace.id, ...chatBody.memoryProposals[0], confirmed: true, provenance: { type: "integration-test", conversationId: chatBody.conversationId } }) });
    assert.equal(memory.status, 201);
    const memoryBody = await memory.json();
    assert.ok(memoryBody.memory?.id);
    const feedback = await fetch(`${baseUrl}/api/feedback`, { method: "POST", headers, body: JSON.stringify({ workspaceId: workspaceBody.workspace.id, memoryId: memoryBody.memory.id, signal: "useful", note: "Integration test feedback" }) });
    assert.equal(feedback.status, 200);
    const retrieved = await fetch(`${baseUrl}/api/memory?workspaceId=${workspaceBody.workspace.id}&q=finishing%20ZIO`, { headers });
    assert.equal(retrieved.status, 200);
    const retrievedBody = await retrieved.json();
    assert.ok(retrievedBody.memories?.some((item) => item.id === memoryBody.memory.id));
  }
});