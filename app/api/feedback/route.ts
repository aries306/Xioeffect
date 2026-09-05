import { z } from "zod";
import { feedbackRequestSchema } from "@/lib/chat";
import { applyMemoryFeedback } from "@/lib/memory";
import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";

const outcomeSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  recommendation: z.string().trim().min(1).max(8_000),
  outcome: z.enum(["accepted", "rejected", "partial", "unknown"]),
  feedback: z.string().trim().max(2_000).optional(),
  conversationId: z.string().uuid().optional(),
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
    if (!parsed.success) return Response.json({ error: "Invalid recommendation outcome" }, { status: 400 });
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
