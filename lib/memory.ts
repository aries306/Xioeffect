import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";
import { scoreContextualMemory } from "@/lib/memory-ranking";
import { evaluateMemoryForContext } from "@/lib/memory-evaluation";
import { resolveProvenance, type ProvenanceResolution } from "@/lib/provenance-resolution";

export type MemoryScope = { workspace?: string; contexts?: string[]; tags?: string[]; [key: string]: unknown };
export type MemoryLifecycleState = "active" | "dormant" | "review" | "superseded" | "invalidated" | "archived" | "rejected";
export type MemoryRecord = { id: string; text: string; category: string; confidence: number; relevance: number; lifecycleState: MemoryLifecycleState; confirmed: boolean; scope: MemoryScope; provenance: Record<string, unknown>; provenanceResolution: ProvenanceResolution; source: string; createdAt: string; updatedAt: string; lastConfirmedAt: string | null; lastRetrievedAt: string | null };
function rowToMemory(row: Record<string, unknown>): MemoryRecord {
  const provenance = (row.provenance ?? {}) as Record<string, unknown>;
  return {
    id: String(row.id),
    text: String(row.text),
    category: String(row.category),
    confidence: Number(row.confidence),
    relevance: Number(row.relevance),
    lifecycleState: String(row.lifecycle_state) as MemoryRecord["lifecycleState"],
    confirmed: Boolean(row.confirmed),
    scope: (row.scope ?? {}) as MemoryScope,
    provenance,
    provenanceResolution: resolveProvenance(provenance, row.created_at),
    source: String(row.source),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    lastConfirmedAt: row.last_confirmed_at ? new Date(String(row.last_confirmed_at)).toISOString() : null,
    lastRetrievedAt: row.last_retrieved_at ? new Date(String(row.last_retrieved_at)).toISOString() : null,
  };
}

export type ContextualMemoryBatch = {
  memories: Array<MemoryRecord & { retrievalScore: number; evaluation: ReturnType<typeof evaluateMemoryForContext> }>;
  diagnostics: {
    candidateCount: number;
    eligibleCount: number;
    returnedCount: number;
    candidateFetchMs: number;
    evaluationRankingMs: number;
    auditWriteMs: number;
    totalMs: number;
  };
};

export async function retrieveContextualMemoryBatch(
  workspaceId: string,
  query: string,
  context: Record<string, unknown> = {},
  limit = 8,
): Promise<ContextualMemoryBatch> {
  const startedAt = Date.now();
  const { userId, workspace } = await getAuthorizedWorkspace(workspaceId, "viewer");
  const sql = db();
  const rows = await sql`select id,text,category,confidence,relevance,lifecycle_state,confirmed,scope,provenance,source,created_at,updated_at,last_confirmed_at,last_retrieved_at
    from memories
    where workspace_id=${workspace.id} and user_id=${userId}
      and lifecycle_state in ('active','dormant','review') and active=true and confidence >= 5
    order by updated_at desc limit 80`;
  const candidateFetchMs = Date.now() - startedAt;

  const evaluationStartedAt = Date.now();
  const evaluated = rows.map((row) => ({
    row,
    evaluation: evaluateMemoryForContext({
      text: String(row.text),
      scope: (row.scope ?? {}) as Record<string, unknown>,
      provenance: (row.provenance ?? {}) as Record<string, unknown>,
      recordedAt: String(row.created_at),
      ownerId: userId,
      lifecycleState: String(row.lifecycle_state),
      confidence: Number(row.confidence),
      relevance: Number(row.relevance),
      updatedAt: String(row.updated_at),
      lastConfirmedAt: row.last_confirmed_at ? String(row.last_confirmed_at) : null,
    }, context),
  }));

  const staleActive = evaluated.filter(({ row, evaluation }) =>
    String(row.lifecycle_state) === "active" &&
    evaluation.status === "stale" &&
    evaluation.reasons.includes("stale_without_recent_confirmation")
  );
  if (staleActive.length > 0) {
    const payload = JSON.stringify(staleActive.map(({ row, evaluation }) => ({
      id: String(row.id),
      evaluation,
    })));
    await sql.begin(async (tx) => {
      await tx`with changed as (
        update memories as memory
        set lifecycle_state='dormant', active=true, last_evaluated_at=now(), evaluation=payload.evaluation
        from jsonb_to_recordset(${payload}::jsonb) as payload(id uuid, evaluation jsonb)
        where memory.id=payload.id and memory.workspace_id=${workspace.id}
          and memory.user_id=${userId} and memory.lifecycle_state='active'
        returning memory.id, memory.confidence, memory.relevance
      )
      insert into memory_events
        (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
      select id,${workspace.id},${userId},'dormant',confidence,confidence,relevance,relevance,'active','dormant',
        'contextual-retrieval', jsonb_build_object('reason','stale_without_recent_confirmation')
      from changed`;
    });
  }

  const scored = evaluated
    .filter(({ evaluation }) => evaluation.eligible)
    .map(({ row, evaluation }) => ({
      row,
      evaluation,
      score: scoreContextualMemory({
        text: String(row.text),
        scope: row.scope ?? {},
        lifecycleState: String(row.lifecycle_state) as "active" | "dormant" | "review",
        confidence: Number(row.confidence),
        relevance: Number(row.relevance),
        updatedAt: String(row.updated_at),
      }, query, context) * evaluation.influenceWeight,
    }))
    .filter((item) => item.score >= 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 20)));
  const evaluationRankingMs = Date.now() - evaluationStartedAt;

  const auditStartedAt = Date.now();
  if (scored.length > 0) {
    const payload = JSON.stringify(scored.map(({ row, score, evaluation }) => ({
      id: String(row.id),
      score: Number(score.toFixed(3)),
      evaluation,
    })));
    await sql.begin(async (tx) => {
      await tx`update memories as memory
        set last_retrieved_at=now(), last_evaluated_at=now(), evaluation=payload.evaluation
        from jsonb_to_recordset(${payload}::jsonb) as payload(id uuid, score double precision, evaluation jsonb)
        where memory.id=payload.id and memory.workspace_id=${workspace.id} and memory.user_id=${userId}`;
      await tx`insert into memory_events
        (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
        select memory.id,${workspace.id},${userId},'retrieved',memory.confidence,memory.confidence,memory.relevance,memory.relevance,
          memory.lifecycle_state,memory.lifecycle_state,'contextual-retrieval',jsonb_build_object('score',payload.score)
        from jsonb_to_recordset(${payload}::jsonb) as payload(id uuid, score double precision)
        join memories as memory on memory.id=payload.id
        where memory.workspace_id=${workspace.id} and memory.user_id=${userId}`;
    });
  }
  const auditWriteMs = Date.now() - auditStartedAt;
  const memories = scored.map(({ row, score, evaluation }) => ({
    ...rowToMemory(row as Record<string, unknown>),
    retrievalScore: Number(score.toFixed(3)),
    evaluation,
  }));
  return {
    memories,
    diagnostics: {
      candidateCount: rows.length,
      eligibleCount: evaluated.filter(({ evaluation }) => evaluation.eligible).length,
      returnedCount: memories.length,
      candidateFetchMs,
      evaluationRankingMs,
      auditWriteMs,
      totalMs: Date.now() - startedAt,
    },
  };
}

export async function retrieveContextualMemories(
  workspaceId: string,
  query: string,
  context: Record<string, unknown> = {},
  limit = 8,
) {
  return (await retrieveContextualMemoryBatch(workspaceId, query, context, limit)).memories;
}

export async function createMemory(input: { workspaceId: string; text: string; category?: string; confidence?: number; relevance?: number; source?: string; scope?: MemoryScope; provenance?: Record<string, unknown>; confirmed?: boolean }) {
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId, "editor"); const text = input.text.trim(); if (!text) throw new Error("Memory text is required"); const sql = db();
  const existing = await sql`select * from memories where workspace_id=${workspace.id} and user_id=${userId} and lower(text)=lower(${text}) and lifecycle_state in ('active','dormant') limit 1`;
  if (existing[0]) {
    const before = Number(existing[0].confidence), relevanceBefore = Number(existing[0].relevance); const after = Math.min(99, before + 8), relevanceAfter = Math.min(100, relevanceBefore + 4); const lifecycle = existing[0].lifecycle_state === 'dormant' ? 'active' : existing[0].lifecycle_state;
    const updated = await sql`update memories set confidence=${after},relevance=${relevanceAfter},lifecycle_state=${lifecycle},active=true,last_confirmed_at=now(),updated_at=now() where id=${existing[0].id} and workspace_id=${workspace.id} returning *`;
    await sql`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source) values (${existing[0].id},${workspace.id},${userId},${lifecycle === 'active' && existing[0].lifecycle_state === 'dormant' ? 'reactivated' : 'reinforced'},${before},${after},${relevanceBefore},${relevanceAfter},${existing[0].lifecycle_state},${lifecycle},${input.source ?? 'conversation'})`;
    return rowToMemory(updated[0] as Record<string, unknown>);
  }
  const confidence = Math.max(5, Math.min(100, Math.round(input.confidence ?? 60))), relevance = Math.max(0, Math.min(100, Math.round(input.relevance ?? 50)));
  const suppliedProvenance = input.provenance ?? { type: "conversation", userId };
  const originType = typeof suppliedProvenance.originKind === "string"
    ? suppliedProvenance.originKind
    : typeof suppliedProvenance.type === "string"
      ? suppliedProvenance.type
      : "conversation";
  const originId = typeof suppliedProvenance.originId === "string"
    ? suppliedProvenance.originId
    : [suppliedProvenance.messageId, suppliedProvenance.conversationId, suppliedProvenance.researchId, suppliedProvenance.sourceId]
      .find((value): value is string => typeof value === "string" && value.trim().length > 0);
  const provenance = {
    ...suppliedProvenance,
    originKind: originType === "sanctum-arrival" ? "user_input" : originType,
    ...(originId ? { originId } : {}),
    capturedAt: typeof suppliedProvenance.capturedAt === "string" && Number.isFinite(Date.parse(suppliedProvenance.capturedAt))
      ? new Date(suppliedProvenance.capturedAt).toISOString()
      : new Date().toISOString(),
  };
  const inserted = await sql`insert into memories (user_id,workspace_id,text,category,confidence,source,confirmed,active,last_confirmed_at,provenance,scope,relevance,lifecycle_state,updated_at) values (${userId},${workspace.id},${text},${input.category ?? 'other'},${confidence},${input.source ?? 'conversation'},${Boolean(input.confirmed)},true,now(),${JSON.stringify(provenance)}::jsonb,${JSON.stringify({ ...(input.scope ?? {}), workspace: workspace.id })}::jsonb,${relevance},'active',now()) returning *`;
  const memory = rowToMemory(inserted[0] as Record<string, unknown>);
  await sql`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source) values (${memory.id},${workspace.id},${userId},'created',null,${confidence},null,${relevance},null,'active',${input.source ?? 'conversation'})`;
  return memory;
}

export async function applyMemoryFeedback(input: { workspaceId: string; memoryId: string; signal: "confirm" | "contradict" | "useful" | "not_useful" | "reactivate" | "supersede" | "review" | "invalidate" | "archive" | "dismiss"; note?: string; recommendationOutcomeId?: string; contradictsMemoryId?: string }) {
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId, "editor");
  const sql = db();
  return await sql.begin(async (tx) => {
    const rows = await tx`select * from memories where id=${input.memoryId} and workspace_id=${workspace.id} and user_id=${userId} limit 1`;
    if (!rows[0]) throw new Error("Memory not found");
    if (input.signal === "contradict" && input.contradictsMemoryId === input.memoryId) {
      throw new Error("A memory cannot contradict itself");
    }
    const target = input.signal === "contradict" && input.contradictsMemoryId
      ? (await tx`select id,lifecycle_state,confidence,relevance from memories where id=${input.contradictsMemoryId} and workspace_id=${workspace.id} and user_id=${userId} limit 1`)[0]
      : null;
    if (input.signal === "contradict" && input.contradictsMemoryId && !target) {
      throw new Error("Contradiction target not found");
    }

    const before = rows[0];
    const confidenceBefore = Number(before.confidence), relevanceBefore = Number(before.relevance);
    let confidence = confidenceBefore, relevance = relevanceBefore, lifecycle = String(before.lifecycle_state);
    let eventType: "confirmed" | "rejected" | "feedback" | "reactivated" | "superseded" | "edited" = "feedback";
    if (input.signal === "confirm" || input.signal === "useful") {
      confidence = Math.min(99, confidence + 12);
      relevance = Math.min(100, relevance + 8);
      lifecycle = "active";
      eventType = input.signal === "confirm" ? "confirmed" : "feedback";
    } else if (input.signal === "contradict") {
      confidence = Math.max(5, confidence - 25);
      relevance = Math.max(0, relevance - 10);
      lifecycle = "review";
    } else if (input.signal === "not_useful") relevance = Math.max(0, relevance - 20);
    else if (input.signal === "reactivate") { lifecycle = "active"; relevance = Math.max(relevance, 60); eventType = "reactivated"; }
    else if (input.signal === "review") lifecycle = "review";
    else if (input.signal === "invalidate") lifecycle = "invalidated";
    else if (input.signal === "archive") lifecycle = "archived";
    else if (input.signal === "dismiss") { lifecycle = "rejected"; eventType = "rejected"; }
    else if (input.signal === "supersede") { lifecycle = "superseded"; eventType = "superseded"; }

    const updated = await tx`update memories set confidence=${confidence},relevance=${relevance},lifecycle_state=${lifecycle},active=${lifecycle === "active" || lifecycle === "dormant" || lifecycle === "review"},updated_at=now(),last_confirmed_at=case when ${input.signal === "confirm" || input.signal === "useful"} then now() else last_confirmed_at end where id=${input.memoryId} and workspace_id=${workspace.id} and user_id=${userId} returning *`;

    if (input.signal === "contradict" && input.contradictsMemoryId && target) {
      await tx`update memories set lifecycle_state='review',active=true where id=${input.contradictsMemoryId} and workspace_id=${workspace.id} and user_id=${userId}`;
      await tx`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
        values (${input.contradictsMemoryId},${workspace.id},${userId},'feedback',${target.confidence},${target.confidence},${target.relevance},${target.relevance},${target.lifecycle_state},'review','user-feedback',${JSON.stringify({ signal: "contradiction-review", sourceMemoryId: input.memoryId })}::jsonb)`;
      await tx`insert into memory_relations (workspace_id,user_id,source_memory_id,target_memory_id,relation_type,confidence,provenance)
        values (${workspace.id},${userId},${input.memoryId},${input.contradictsMemoryId},'contradicts',90,${JSON.stringify({ type: "user-feedback", sourceMemoryId: input.memoryId, targetMemoryId: input.contradictsMemoryId })}::jsonb)
        on conflict (source_memory_id,target_memory_id,relation_type) do update set confidence=excluded.confidence,provenance=excluded.provenance`;
    }

    await tx`insert into memory_feedback (memory_id,recommendation_outcome_id,workspace_id,user_id,signal,note) values (${input.memoryId},${input.recommendationOutcomeId ?? null},${workspace.id},${userId},${input.signal},${input.note ?? null})`;
    await tx`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
      values (${input.memoryId},${workspace.id},${userId},${eventType},${confidenceBefore},${confidence},${relevanceBefore},${relevance},${before.lifecycle_state},${lifecycle},'user-feedback',${JSON.stringify({ signal: input.signal, note: input.note ?? null })}::jsonb)`;
    return rowToMemory(updated[0] as Record<string, unknown>);
  });
}

export async function updateMemory(input: { workspaceId: string; memoryId: string; text?: string; category?: string; scope?: MemoryScope; provenance?: Record<string, unknown> }) {
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId, "editor");
  const text = input.text?.trim();
  if (text === "") throw new Error("Memory text is required");
  const sql = db();
  const existing = await sql`select * from memories where id=${input.memoryId} and workspace_id=${workspace.id} and user_id=${userId} limit 1`;
  if (!existing[0]) throw new Error("Memory not found");
  const updated = await sql`
    update memories set
      text=coalesce(${text ?? null}, text),
      category=coalesce(${input.category ?? null}, category),
      scope=coalesce(${input.scope ? JSON.stringify(input.scope) : null}::jsonb, scope),
      provenance=coalesce(${input.provenance ? JSON.stringify(input.provenance) : null}::jsonb, provenance),
      updated_at=now()
    where id=${input.memoryId} and workspace_id=${workspace.id} and user_id=${userId}
    returning *
  `;
  await sql`insert into memory_events (memory_id,workspace_id,user_id,event_type,confidence_before,confidence_after,relevance_before,relevance_after,lifecycle_before,lifecycle_after,source,metadata)
    values (${input.memoryId},${workspace.id},${userId},'edited',${existing[0].confidence},${updated[0].confidence},${existing[0].relevance},${updated[0].relevance},${existing[0].lifecycle_state},${updated[0].lifecycle_state},'user-edit',${JSON.stringify({ fields: Object.keys(input).filter((key) => key !== 'workspaceId' && key !== 'memoryId') })}::jsonb)`;
  return rowToMemory(updated[0] as Record<string, unknown>);
}
