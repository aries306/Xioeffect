import { feedbackRequestSchema } from "@/lib/chat";
import { applyMemoryFeedback } from "@/lib/memory";
import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";

const outcomeSchema = feedbackRequestSchema.pick({ workspaceId: true }).extend({
  recommendation: feedbackRequestSchema.shape.note.optional(),
  outcome: feedbackRequestSchema.shape.signal.transform((value) => value === "confirm" ? "accepted" : value === "contradict" ? "rejected" : value === "useful" ? "partial" : "unknown").optional(),
  feedback: feedbackRequestSchema.shape.note.optional(),
  conversationId: feedbackRequestSchema.shape.recommendationOutcomeId.optional(),
});

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

    const parsed = outcomeSchema.safeParse(body);
    if (!parsed.success || !parsed.data.recommendation || !parsed.data.outcome) {
      return Response.json({ error: "Invalid recommendation outcome" }, { status: 400 });
    }
    const { userId, workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId);
    const sql = db();
    const inserted = await sql`
      insert into recommendation_outcomes (workspace_id, user_id, conversation_id, recommendation, outcome, feedback)
      values (${workspace.id}, ${userId}, ${parsed.data.conversationId ?? null}, ${parsed.data.recommendation}, ${parsed.data.outcome}, ${parsed.data.feedback ?? null})
      returning id, created_at
    `;
    await sql`
      insert into events (user_id, kind, metadata)
      values (${userId}, 'recommendation-feedback', ${JSON.stringify({ workspaceId: workspace.id, outcome: parsed.data.outcome })}::jsonb)
    `;
    return Response.json({ outcome: inserted[0] }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to record feedback";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    if (/access denied|not found/i.test(message)) return Response.json({ error: message }, { status: 403 });
    return Response.json({ error: "Unable to record feedback" }, { status: 500 });
  }
}
