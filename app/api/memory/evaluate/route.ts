import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";
import { evaluateMemoryForContext } from "@/lib/memory-evaluation";

const schema = z.object({
  workspaceId: z.string().uuid().optional(),
  memoryId: z.string().uuid(),
  context: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Invalid memory evaluation request" }, { status: 400 });
    const { userId, workspace } = await getAuthorizedWorkspace(parsed.data.workspaceId, "viewer");
    const sql = db();
    const rows = await sql`select * from memories where id=${parsed.data.memoryId} and workspace_id=${workspace.id} and user_id=${userId} limit 1`;
    if (!rows[0]) return Response.json({ error: "Memory not found" }, { status: 404 });
    const row = rows[0];
    const evaluation = evaluateMemoryForContext({
      text: String(row.text),
      scope: (row.scope ?? {}) as Record<string, unknown>,
      provenance: Object.prototype.hasOwnProperty.call((row.provenance ?? {}) as Record<string, unknown>, "capturedAt")
        ? (row.provenance ?? {}) as Record<string, unknown>
        : { ...((row.provenance ?? {}) as Record<string, unknown>), capturedAt: String(row.created_at) },
      lifecycleState: String(row.lifecycle_state),
      confidence: Number(row.confidence),
      relevance: Number(row.relevance),
      updatedAt: String(row.updated_at),
      lastConfirmedAt: row.last_confirmed_at ? String(row.last_confirmed_at) : null,
    }, parsed.data.context);

    await sql`update memories set last_evaluated_at=now(), evaluation=${JSON.stringify(evaluation)}::jsonb where id=${row.id} and workspace_id=${workspace.id}`;
    await sql`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
      values (${row.id},${workspace.id},${userId},'evaluated',${row.confidence},${row.confidence},${row.relevance},${row.relevance},${row.lifecycle_state},${row.lifecycle_state},'contextual-evaluation',${JSON.stringify({ evaluation })}::jsonb)`;
    return Response.json({ memoryId: row.id, evaluation });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate memory";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Unable to evaluate memory" }, { status: 500 });
  }
}
