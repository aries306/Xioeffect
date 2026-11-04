import test from "node:test";
import assert from "node:assert/strict";

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
