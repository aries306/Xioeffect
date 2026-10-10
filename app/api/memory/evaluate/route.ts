import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";
import { evaluateMemoryForContext, findContradictionCandidates, type MemoryEvaluationInput } from "@/lib/memory-evaluation";

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
    const candidateRows = await sql`select id,text,category,confidence,relevance,lifecycle_state,scope,provenance,created_at,updated_at,last_confirmed_at from memories where workspace_id=${workspace.id} and user_id=${userId} and id<> ${row.id} and category=${row.category} and active=true and lifecycle_state in ('active','dormant','review') and not exists (
      select 1 from memory_relations relation
      where relation.relation_type='contradicts'
        and ((relation.source_memory_id=memories.id and relation.target_memory_id=${row.id})
          or (relation.target_memory_id=memories.id and relation.source_memory_id=${row.id}))
    ) order by updated_at desc limit 40`;
    const candidateInputs = candidateRows.map((candidate) => ({
      id: String(candidate.id),
      text: String(candidate.text),
      category: String(candidate.category),
      lifecycleState: String(candidate.lifecycle_state),
      confidence: Number(candidate.confidence),
      relevance: Number(candidate.relevance),
      scope: (candidate.scope ?? {}) as Record<string, unknown>,
      provenance: Object.prototype.hasOwnProperty.call((candidate.provenance ?? {}) as Record<string, unknown>, "capturedAt")
        ? (candidate.provenance ?? {}) as Record<string, unknown>
        : { ...((candidate.provenance ?? {}) as Record<string, unknown>), capturedAt: String(candidate.created_at) },
      updatedAt: String(candidate.updated_at),
      lastConfirmedAt: candidate.last_confirmed_at ? String(candidate.last_confirmed_at) : null,
    }));
    const currentInput = {
      text: String(row.text),
      category: String(row.category),
      lifecycleState: String(row.lifecycle_state),
      confidence: Number(row.confidence),
      relevance: Number(row.relevance),
      scope: (row.scope ?? {}) as Record<string, unknown>,
      provenance: Object.prototype.hasOwnProperty.call((row.provenance ?? {}) as Record<string, unknown>, "capturedAt")
        ? (row.provenance ?? {}) as Record<string, unknown>
        : { ...((row.provenance ?? {}) as Record<string, unknown>), capturedAt: String(row.created_at) },
      updatedAt: String(row.updated_at),
      lastConfirmedAt: row.last_confirmed_at ? String(row.last_confirmed_at) : null,
    };
    const potentialConflicts = findContradictionCandidates(currentInput, candidateInputs as MemoryEvaluationInput[])
      .map((candidate) => ({ id: (candidate as MemoryEvaluationInput & { id: string }).id, text: candidate.text, category: candidate.category ?? "other" }));
    await sql`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
      values (${row.id},${workspace.id},${userId},'evaluated',${row.confidence},${row.confidence},${row.relevance},${row.relevance},${row.lifecycle_state},${row.lifecycle_state},'contextual-evaluation',${JSON.stringify({ evaluation })}::jsonb)`;
    return Response.json({ memoryId: row.id, evaluation, potentialConflicts, conflictDetection: "lexical_candidates_require_user_review" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to evaluate memory";
    if (/Authentication is required/i.test(message)) return Response.json({ error: message }, { status: 401 });
    return Response.json({ error: "Unable to evaluate memory" }, { status: 500 });
  }
}
