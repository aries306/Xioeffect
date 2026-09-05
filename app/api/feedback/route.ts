import { feedbackRequestSchema, recommendationOutcomeSchema } from "@/lib/chat";
import { applyMemoryFeedback } from "@/lib/memory";
import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (body?.memoryId) {
      const parsed = feedbackRequestSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid memory feedback" }, { status: 400 });
      const { workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId);
      const memory = await applyMemoryFeedback({ ...parsed.data, workspaceId: String(workspace.id) });
      return Response.json({ memory });
    }

    const parsed = recommendationOutcomeSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "Invalid recommendation outcome" }, { status: 400 });
    const { userId, workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId);
    const sql = db();
    if (parsed.data.conversationId) {
      const allowed = await sql`select id from conversations where id=${parsed.data.conversationId} and workspace_id=${workspace.id} and user_id=${userId} limit 1`;
      if (!allowed[0]) return Response.json({ error: "Conversation access denied" }, { status: 403 });
    }
    if (parsed.data.memoryIds.length) {
      const allowedMemories = await sql`select id from memories where workspace_id=${workspace.id} and user_id=${userId} and id = any(${parsed.data.memoryIds}::uuid[])`;
      if (allowedMemories.length !== parsed.data.memoryIds.length) return Response.json({ error: "Memory access denied" }, { status: 403 });
    }
    const inserted = await sql`
      insert into recommendation_outcomes (workspace_id, user_id, conversation_id, recommendation, outcome, feedback, metadata)
      values (${workspace.id}, ${userId}, ${parsed.data.conversationId ?? null}, ${parsed.data.recommendation}, ${parsed.data.outcome}, ${parsed.data.feedback ?? null}, ${JSON.stringify({ memoryIds: parsed.data.memoryIds })}::jsonb)
      returning id, created_at
    `;

    const signal = parsed.data.outcome === "accepted" || parsed.data.outcome === "partial" ? "useful" : parsed.data.outcome === "rejected" ? "not_useful" : null;
    if (signal) for (const memoryId of parsed.data.memoryIds) await applyMemoryFeedback({ workspaceId: String(workspace.id), memoryId, signal, note: parsed.data.feedback, recommendationOutcomeId: String(inserted[0].id) });
    await sql`insert into events (user_id, kind, metadata) values (${userId}, 'recommendation-feedback', ${JSON.stringify({ workspaceId: workspace.id, outcome: parsed.data.outcome, memoryCount: parsed.data.memoryIds.length })}::jsonb)`;
    console.info(JSON.stringify({ event: "astara.feedback.recorded", userId, workspaceId: workspace.id, outcome: parsed.data.outcome, memoryCount: parsed.data.memoryIds.length }));
    return Response.json({ outcome: inserted[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record feedback";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/access denied|not found/i.test(message)) return Response.json({ error: message }, { status: 403 });
    return Response.json({ error: "Unable to record feedback" }, { status: 500 });
  }
}
