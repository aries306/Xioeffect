import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read = (path) => fs.readFile(path, 'utf8');

test('Memory Fabric keeps evidence distinct from reasoning', async () => {
  const memory = await read('lib/memory.ts'); const astara = await read('lib/astara.ts');
  assert.match(memory, /provenance/); assert.match(memory, /lifecycle_state/); assert.match(memory, /relevance/); assert.match(memory, /scope/);
  assert.match(astara, /contextual evidence/); assert.match(astara, /recommendation/);
});

test('Workspace and memory routes enforce authenticated service boundaries', async () => {
  const workspace = await read('lib/workspace.ts'); const memoryRoute = await read('app/api/memory/route.ts'); const chatRoute = await read('app/api/chat/route.ts');
  assert.match(workspace, /requireUser/); assert.match(workspace, /workspace_members/); assert.match(memoryRoute, /getAuthorizedWorkspace/); assert.match(chatRoute, /runAstara/);
});

test('Feedback updates lifecycle and records provenance history', async () => {
  const memory = await read('lib/memory.ts'); const feedback = await read('app/api/feedback/route.ts');
  assert.match(memory, /memory_feedback/); assert.match(memory, /memory_events/); assert.match(memory, /reactivated/); assert.match(feedback, /recommendation_outcomes/);
});

test('Memory lifecycle supports re-evaluation states and explicit archive/edit controls', async () => {
  const memory = await read('lib/memory.ts'); const route = await read('app/api/memory/route.ts'); const migration = await read('db/migrations/004_memory_lifecycle_controls.sql');
  assert.match(memory, /"review"/); assert.match(memory, /"invalidated"/); assert.match(memory, /"archived"/);
  assert.match(memory, /lifecycle_state='active'/); assert.match(route, /export async function PATCH/); assert.match(route, /export async function DELETE/);
  assert.match(migration, /memories_lifecycle_state_check/);
});

test('Live authenticated loop exercises the real server when test credentials are supplied', async (t) => {
  const baseUrl = process.env.XIO_TEST_BASE_URL; const cookie = process.env.XIO_TEST_COOKIE;
  if (!baseUrl || !cookie) { t.skip('Set XIO_TEST_BASE_URL and XIO_TEST_COOKIE to run the real authenticated integration loop'); return; }
  const anonymous = await fetch(`${baseUrl}/api/workspace`, { redirect: 'manual' }); assert.notEqual(anonymous.status, 200);
  const headers = { Cookie: cookie, 'Content-Type': 'application/json' };
  const workspace = await fetch(`${baseUrl}/api/workspace`, { headers }); assert.equal(workspace.status, 200);
  const workspaceBody = await workspace.json(); assert.ok(workspaceBody.workspace?.id);
  const chat = await fetch(`${baseUrl}/api/chat`, { method: 'POST', headers, body: JSON.stringify({ workspaceId: workspaceBody.workspace.id, message: 'I am working toward finishing ZIO this week.' }) });
  assert.equal(chat.status, 200); const chatBody = await chat.json(); assert.ok(chatBody.conversationId); assert.ok(chatBody.answer);
  if (chatBody.memoryProposals?.length) {
    const memory = await fetch(`${baseUrl}/api/memory`, { method: 'POST', headers, body: JSON.stringify({ workspaceId: workspaceBody.workspace.id, ...chatBody.memoryProposals[0], confirmed: true, provenance: { type: 'integration-test', conversationId: chatBody.conversationId } }) });
    assert.equal(memory.status, 201); const memoryBody = await memory.json(); assert.ok(memoryBody.memory?.id);
    const feedback = await fetch(`${baseUrl}/api/feedback`, { method: 'POST', headers, body: JSON.stringify({ workspaceId: workspaceBody.workspace.id, memoryId: memoryBody.memory.id, signal: 'useful', note: 'Integration test feedback' }) });
    assert.equal(feedback.status, 201);
    const retrieved = await fetch(`${baseUrl}/api/memory?workspaceId=${workspaceBody.workspace.id}&q=finishing%20ZIO`, { headers });
    assert.equal(retrieved.status, 200); const retrievedBody = await retrieved.json(); assert.ok(retrievedBody.memories?.some((item) => item.id === memoryBody.memory.id));
  }
});


test('Database lifecycle constraints match application feedback signals', async () => {
  const migration = await read('db/migrations/003_memory_fabric_workspace.sql');
  const alignment = await read('db/migrations/005_memory_feedback_alignment.sql');
  const chat = await read('lib/chat.ts');
  for (const signal of ['confirm','contradict','useful','not_useful','reactivate','supersede','review','invalidate','archive','dismiss']) {
    assert.match(chat, new RegExp('"' + signal + '"'));
    assert.match(alignment, new RegExp("'" + signal + "'"));
  }
  assert.match(migration, /memory_feedback/);
  assert.match(alignment, /memory_feedback_signal_check/);
});

test('Memory mutation routes require write-capable workspace roles', async () => {
  const route = await read('app/api/memory/route.ts');
  assert.equal((route.match(/getAuthorizedWorkspace\([^)]*, \["owner", "editor"\]\)/g) ?? []).length, 3);
});
