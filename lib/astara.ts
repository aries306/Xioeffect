import { db } from "@/lib/db";
import { generateAiResponse } from "@/lib/ai";
import { retrieveContextualMemoryBatch } from "@/lib/memory";
import { getAuthorizedWorkspace, readWorkspaceState } from "@/lib/workspace";
import { parseInferenceLedger } from "@/lib/inference-confidence";

export type VeyronContext = { workspaceId: string; userMessage: string; conversationId?: string; context?: Record<string, unknown> };

export async function runAvenne(input: VeyronContext) {
  const started = Date.now();
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId, "editor");
  const retrievalStarted = Date.now();
  const [workspaceState, retrieval] = await Promise.all([
    readWorkspaceState(workspace.id),
    retrieveContextualMemoryBatch(
      workspace.id,
      input.userMessage,
      {
        ...(input.context ?? {}),
        context: typeof input.context?.context === "string" && input.context.context.trim() ? input.context.context.trim() : "personal",
        workspaceName: workspace.name,
      },
      8,
    ),
  ]);
  const retrievalWallMs = Date.now() - retrievalStarted;
  const memories = retrieval.memories;
  const sql = db();
  let conversationId = input.conversationId;
  if (conversationId) {
    const allowed = await sql`select c.id from conversations c where c.id=${conversationId} and c.workspace_id=${workspace.id} and c.user_id=${userId} limit 1`;
    if (!allowed[0]) throw new Error("Conversation access denied");
  } else {
    const created = await sql`insert into conversations (user_id, workspace_id) values (${userId}, ${workspace.id}) returning id`;
    conversationId = String(created[0].id);
  }
  const recentMessages = await sql`select role, content from messages where conversation_id=${conversationId} order by created_at desc limit 12`;
  const evidence = memories.map((memory) => ({
    id: memory.id,
    text: memory.text,
    category: memory.category,
    memoryConfidence: memory.confidence,
    relevance: memory.relevance,
    lifecycleState: memory.lifecycleState,
    scope: memory.scope,
    provenance: memory.provenance,
    provenanceResolution: memory.provenanceResolution,
    retrievalScore: memory.retrievalScore,
    evaluation: memory.evaluation,
  }));
  const system = `You are Avenne, the reasoning and conversational intelligence within Zuna.

You are perceptive, grounded, direct, and calm. Zuna is the user's evolving intelligence environment. Vea is the guide in the arrival experience; Avenne is the reasoning path that evaluates evidence before responses and recommendations.

Use only the authorized workspace context and evidence supplied below. Treat retrieved memories as contextual evidence, never as unquestioned truth. A memory's stored memoryConfidence is not the confidence of a new inference. Do not merge Memory, Research, NEXUS processing events, Belief, Pattern, Insight, or Recommendation into one category. NEXUS ingestion/processing events are not memory evidence or assertions unless an independently resolved source record is explicitly supplied.

For every substantive inferential claim in your answer that goes beyond directly restating the user's words or supplied facts, create one concise entry in the inference ledger described below. Do not expose private chain-of-thought or step-by-step internal reasoning. Each entry must contain:
- claim: the concise inferential conclusion
- confidenceScore: an integer from 0 to 100 representing your current, uncalibrated estimate of support
- evidenceIds: only IDs from the supplied evidence, or "current_input" when the claim is based on the current user message
- uncertaintyFactors: concrete missing, conflicting, stale, or weak evidence

Do not invent evidence IDs. Do not describe these scores as calibrated probabilities. If evidence is weak or absent, lower the score and state the uncertainty factor. If the answer contains no inference, use an empty array.

At the very end of your response, append exactly one machine-readable block:
<inference_ledger>
[{"claim":"...","confidenceScore":0,"evidenceIds":["current_input"],"uncertaintyFactors":["..."]}]
</inference_ledger>
The block must contain valid JSON. It is metadata, not part of the user-facing prose.

Workspace: ${workspace.name}
Workspace data: ${JSON.stringify({ context: workspace.context, goals: workspaceState.goals })}
Current input reference: current_input
Eligible contextual memory evidence: ${JSON.stringify(evidence)}

When appropriate, provide a clear recommendation. If you do, put it on its own line beginning exactly with "Recommendation:" so the product can record the outcome. Keep the response useful and concise.`;
  await sql`insert into messages (conversation_id, role, content) values (${conversationId}, 'user', ${input.userMessage})`;
  const rawAnswer = await generateAiResponse([
    { role: "system", content: system },
    ...recentMessages.reverse().map((message) => ({ role: message.role as "user" | "assistant", content: String(message.content) })),
    { role: "user", content: input.userMessage },
  ]);
  const confidenceLedger = parseInferenceLedger(
    rawAnswer,
    memories.map((memory) => memory.id),
  );
  const answer = confidenceLedger.answer;
  await sql`insert into messages (conversation_id, role, content) values (${conversationId}, 'assistant', ${answer})`;
  const recommendation = answer.match(/^Recommendation:\\s*(.+)$/im)?.[1]?.trim() ?? null;
  const diagnostics = {
    memoryCount: memories.length,
    retrievalWallMs,
    retrieval: retrieval.diagnostics,
    inferenceCount: confidenceLedger.inferences.length,
    inferenceConfidenceStatus: confidenceLedger.status,
    inferenceConfidenceIssues: confidenceLedger.issues,
    durationMs: Date.now() - started,
  };
  await sql`insert into events (user_id, kind, metadata) values (${userId}, 'avenne-response', ${JSON.stringify({ workspaceId: workspace.id, memoryCount: memories.length, recommendationGenerated: Boolean(recommendation), ...diagnostics })}::jsonb)`;
  return {
    conversationId,
    answer,
    recommendation,
    evidence,
    inferences: confidenceLedger.inferences,
    inferenceConfidenceStatus: confidenceLedger.status,
    inferenceConfidenceIssues: confidenceLedger.issues,
    diagnostics,
  };
}
