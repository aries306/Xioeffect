import { db } from "@/lib/db";
import { generateAiResponse } from "@/lib/ai";
import { retrieveContextualMemories, type MemoryRecord } from "@/lib/memory";
import { getAuthorizedWorkspace, readWorkspaceState } from "@/lib/workspace";

export type VeyronContext = { workspaceId: string; userMessage: string; conversationId?: string };

export async function runAvenne(input: VeyronContext) {
  const started = Date.now();
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId, "editor");
  const workspaceState = await readWorkspaceState(workspace.id);
  const memories = await retrieveContextualMemories(
    workspace.id,
    input.userMessage,
    { workspaceName: workspace.name, goals: workspaceState.goals.map((goal) => goal.title) },
    8,
  );
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
    id: memory.id, text: memory.text, category: memory.category, confidence: memory.confidence,
    relevance: memory.relevance, lifecycleState: memory.lifecycleState, scope: memory.scope,
    provenance: memory.provenance, retrievalScore: memory.retrievalScore,
  }));
  const system = `You are Avenne, the conversational intelligence inside Veyron.

You are warm, perceptive, grounded, direct, and calm. Veyron is the surrounding intelligence system; you are its voice and conversational presence.

Treat retrieved memories as contextual evidence, never as unquestioned truth. Do not invent facts. Distinguish memory from belief, pattern, insight, and recommendation. Dormant or review-state memory is explicitly uncertain and must be re-evaluated against the current context before it influences a recommendation. Re-evaluate conflicting or low-confidence evidence before relying on it. Use only the authorized workspace context below.

Workspace: ${workspace.name}
Workspace data: ${JSON.stringify({ context: workspace.context, goals: workspaceState.goals })}
Contextual memory evidence: ${JSON.stringify(evidence)}

When appropriate, provide a clear recommendation. If you do, put it on its own line beginning exactly with "Recommendation:" so the product can record the outcome. Keep the response useful and concise.`;
  await sql`insert into messages (conversation_id, role, content) values (${conversationId}, 'user', ${input.userMessage})`;
  const answer = await generateAiResponse([
    { role: "system", content: system },
    ...recentMessages.reverse().map((message) => ({ role: message.role as "user" | "assistant", content: String(message.content) })),
    { role: "user", content: input.userMessage },
  ]);
  await sql`insert into messages (conversation_id, role, content) values (${conversationId}, 'assistant', ${answer})`;
  const recommendation = answer.match(/^Recommendation:\s*(.+)$/im)?.[1]?.trim() ?? null;
  await sql`insert into events (user_id, kind, metadata) values (${userId}, 'avenne-response', ${JSON.stringify({ workspaceId: workspace.id, memoryCount: memories.length, recommendationGenerated: Boolean(recommendation), durationMs: Date.now() - started })}::jsonb)`;
  return {
    conversationId,
    answer,
    recommendation,
    evidence: evidence as Array<MemoryRecord & { retrievalScore: number }>,
    diagnostics: { memoryCount: memories.length, durationMs: Date.now() - started },
  };
}
