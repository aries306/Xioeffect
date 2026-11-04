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

test("Live authenticated Memory Fabric context-switch and contradiction acceptance flow", async (t) => {
  const baseUrl = process.env.STAGING_BASE_URL ?? process.env.XIO_TEST_BASE_URL;
  const cookie = process.env.STAGING_CLERK_TEST_COOKIE ?? process.env.XIO_TEST_COOKIE;
  const otherCookie = process.env.STAGING_CLERK_OTHER_TEST_COOKIE;
  if (!baseUrl || !cookie || !otherCookie) {
    if (process.env.CI_REQUIRE_LIVE_ACCEPTANCE === "1") {
      assert.fail("CI_REQUIRE_LIVE_ACCEPTANCE=1 requires STAGING_BASE_URL, STAGING_CLERK_TEST_COOKIE, and STAGING_CLERK_OTHER_TEST_COOKIE; refusing a green build with authenticated acceptance skipped");
    }
    t.skip("Set STAGING_BASE_URL, STAGING_CLERK_TEST_COOKIE, and STAGING_CLERK_OTHER_TEST_COOKIE to run the real authenticated integration loop");
    return;
  }

  const headers = { Cookie: cookie, "Content-Type": "application/json" };
  const otherHeaders = { Cookie: otherCookie, "Content-Type": "application/json" };
  const anonymous = await fetch(`${baseUrl}/api/workspace`, { redirect: "manual" });
  assert.notEqual(anonymous.status, 200);
  const workspaceResponse = await fetch(`${baseUrl}/api/workspace`, { headers });
  assert.equal(workspaceResponse.status, 200);
  const { workspace } = await workspaceResponse.json();
  assert.ok(workspace?.id);

  // A second independently authenticated Clerk user must not be able to
  // resolve, read, or mutate the first user's private workspace.
  const crossUserWorkspace = await fetch(`${baseUrl}/api/workspace?workspaceId=${workspace.id}`, { headers: otherHeaders });
  assert.equal(crossUserWorkspace.status, 403);
  const crossUserMemories = await fetch(`${baseUrl}/api/memory?workspaceId=${workspace.id}`, { headers: otherHeaders });
  assert.equal(crossUserMemories.status, 403);

  const nonce = `acceptance-${Date.now()}`;
  const createdIds = [];
  const createMemory = async (text) => {
    const response = await fetch(`${baseUrl}/api/memory`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: workspace.id,
        text,
        category: "preference",
        confidence: 85,
        relevance: 95,
        confirmed: true,
        scope: { originContext: "project-alpha" },
        provenance: { type: "acceptance-test", source: "user-confirmed", capturedAt: new Date().toISOString(), context: "project-alpha" },
      }),
    });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.ok(body.memory?.id);
    createdIds.push(body.memory.id);
    return body.memory;
  };

  try {
    const first = await createMemory(`[${nonce}] For launch planning, preferred deployment region is Canada Central.`);
    const second = await createMemory(`[${nonce}] For launch planning, preferred deployment region is US East.`);

    const crossUserMutation = await fetch(`${baseUrl}/api/memory`, {
      method: "PATCH",
      headers: otherHeaders,
      body: JSON.stringify({ workspaceId: workspace.id, memoryId: first.id, text: `[${nonce}] unauthorized overwrite` }),
    });
    assert.equal(crossUserMutation.status, 403);

    // Return in a different context. The origin context is provenance, not a
    // hard fence: the candidate must be re-evaluated before it can influence.
    const retrieval = await fetch(
      `${baseUrl}/api/memory?workspaceId=${workspace.id}&context=project-beta&q=${encodeURIComponent(nonce + " launch planning preferred deployment region")}`,
      { headers },
    );
    assert.equal(retrieval.status, 200);
    const retrievalBody = await retrieval.json();
    assert.ok(retrievalBody.memories?.some((item) => item.id === first.id));
    const retrieved = retrievalBody.memories.find((item) => item.id === first.id);
    assert.ok(retrieved.provenance?.capturedAt);
    assert.equal(retrieved.evaluation?.eligible, true);

    const evaluationResponse = await fetch(`${baseUrl}/api/memory/evaluate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ workspaceId: workspace.id, memoryId: first.id, context: { context: "project-beta" } }),
    });
    assert.equal(evaluationResponse.status, 200);
    const evaluationBody = await evaluationResponse.json();
    assert.equal(evaluationBody.evaluation?.eligible, true);
    assert.ok(evaluationBody.potentialConflicts?.some((item) => item.id === second.id));
    assert.equal(evaluationBody.conflictDetection, "lexical_candidates_require_user_review");

    const correctedText = `[${nonce}] For launch planning, preferred deployment region is Canada Central (user-corrected).`;
    const correction = await fetch(`${baseUrl}/api/memory`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ workspaceId: workspace.id, memoryId: first.id, text: correctedText }),
    });
    assert.equal(correction.status, 200);
    const correctionBody = await correction.json();
    assert.equal(correctionBody.memory?.text, correctedText);

    const correctedRetrieval = await fetch(
      `${baseUrl}/api/memory?workspaceId=${workspace.id}&context=project-alpha&q=${encodeURIComponent(nonce + " Canada Central user-corrected")}`,
      { headers },
    );
    assert.equal(correctedRetrieval.status, 200);
    const correctedBody = await correctedRetrieval.json();
    assert.ok(correctedBody.memories?.some((item) => item.id === first.id && item.text === correctedText));

    const feedback = await fetch(`${baseUrl}/api/feedback`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        workspaceId: workspace.id,
        memoryId: first.id,
        signal: "contradict",
        contradictsMemoryId: second.id,
        note: "Acceptance test: user confirms these records conflict.",
      }),
    });
    assert.equal(feedback.status, 200);

    for (const memoryId of [first.id, second.id]) {
      const response = await fetch(`${baseUrl}/api/memory/evaluate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ workspaceId: workspace.id, memoryId, context: { context: "project-beta" } }),
      });
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.evaluation?.eligible, false);
      assert.equal(body.evaluation?.status, "review");
      assert.equal(body.evaluation?.influenceWeight, 0);
    }

    const archive = await fetch(`${baseUrl}/api/memory`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ workspaceId: workspace.id, memoryId: second.id }),
    });
    assert.equal(archive.status, 200);
    const archiveBody = await archive.json();
    assert.equal(archiveBody.memory?.lifecycleState, "archived");

    const afterArchive = await fetch(
      `${baseUrl}/api/memory?workspaceId=${workspace.id}&context=project-beta&q=${encodeURIComponent(nonce)}`,
      { headers },
    );
    assert.equal(afterArchive.status, 200);
    const archivedRetrieval = await afterArchive.json();
    assert.ok(!archivedRetrieval.memories?.some((item) => item.id === second.id));
  } finally {
    await Promise.all(createdIds.map((memoryId) => fetch(`${baseUrl}/api/memory`, {
      method: "DELETE",
      headers,
      body: JSON.stringify({ workspaceId: workspace.id, memoryId }),
    })));
  }
});
