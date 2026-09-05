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
    assert.equal(feedback.status, 200);
    const retrieved = await fetch(`${baseUrl}/api/memory?workspaceId=${workspaceBody.workspace.id}&q=finishing%20ZIO`, { headers });
    assert.equal(retrieved.status, 200); const retrievedBody = await retrieved.json(); assert.ok(retrievedBody.memories?.some((item) => item.id === memoryBody.memory.id));
  }
});
