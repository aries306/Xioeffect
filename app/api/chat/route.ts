import { chatRequestSchema } from "@/lib/chat";
import { runAstara } from "@/lib/astara";
import { createMemory } from "@/lib/memory";
import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";
import { extractMemoryCandidates } from "@/lib/memory-candidates";

export async function POST(request: Request) {
  try {
    const parsed = chatRequestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid chat request" }, { status: 400 });
    const { message, workspaceId, conversationId } = parsed.data;
    const { userId, workspace } = await getAuthorizedWorkspace(workspaceId);
    const sql = db();
    const preferences = await sql`select learning_enabled, ask_before_memory from preferences where user_id=${userId} limit 1`;
    const learningEnabled = preferences[0]?.learning_enabled ?? true;
    const askBeforeMemory = preferences[0]?.ask_before_memory ?? true;
    const result = await runAstara({ workspaceId: String(workspace.id), userMessage: message, conversationId });
    const candidates = learningEnabled ? extractMemoryCandidates(message) : [];
    const persisted = [];
    if (learningEnabled && !askBeforeMemory) for (const candidate of candidates) persisted.push(await createMemory({
      workspaceId: String(workspace.id), text: candidate.text, category: candidate.category,
      confidence: candidate.confidence, relevance: candidate.relevance, source: candidate.source,
      provenance: { type: "conversation", conversationId: result.conversationId, userId }, scope: { conversationId: result.conversationId }, confirmed: false,
    }));
    console.info(JSON.stringify({ event: "astara.chat.completed", userId, workspaceId: workspace.id, conversationId: result.conversationId, memoryCount: result.evidence.length, candidateCount: candidates.length, persistedMemoryCount: persisted.length, durationMs: result.diagnostics.durationMs }));
    return Response.json({ ...result, memoryProposals: askBeforeMemory ? candidates : [], persistedMemoryIds: persisted.map((memory) => memory.id), evidenceMemoryIds: result.evidence.map((memory) => memory.id) });
  } catch (error) {
    console.error("astara.chat.failed", error instanceof Error ? error.message : "unknown error");
    const message = error instanceof Error ? error.message : "Unable to process chat";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/access denied|not found/i.test(message)) return Response.json({ error: message }, { status: 403 });
    return Response.json({ error: "Unable to process chat" }, { status: 500 });
  }
}
