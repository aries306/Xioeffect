import { db } from "@/lib/db";
import { getAuthorizedWorkspace } from "@/lib/workspace";

export type MemoryScope = {
  workspace?: string;
  contexts?: string[];
  tags?: string[];
  [key: string]: unknown;
};

export type MemoryRecord = {
  id: string;
  text: string;
  category: string;
  confidence: number;
  relevance: number;
  lifecycleState: "active" | "dormant" | "superseded" | "rejected";
  confirmed: boolean;
  scope: MemoryScope;
  provenance: Record<string, unknown>;
  source: string;
  createdAt: string;
  updatedAt: string;
  lastConfirmedAt: string;
  lastRetrievedAt: string | null;
};

function rowToMemory(row: Record<string, unknown>): MemoryRecord {
  return {
    id: String(row.id),
    text: String(row.text),
    category: String(row.category),
    confidence: Number(row.confidence),
    relevance: Number(row.relevance),
    lifecycleState: String(row.lifecycle_state) as MemoryRecord["lifecycleState"],
    confirmed: Boolean(row.confirmed),
    scope: (row.scope ?? {}) as MemoryScope,
    provenance: (row.provenance ?? {}) as Record<string, unknown>,
    source: String(row.source),
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    lastConfirmedAt: new Date(String(row.last_confirmed_at)).toISOString(),
    lastRetrievedAt: row.last_retrieved_at ? new Date(String(row.last_retrieved_at)).toISOString() : null,
  };
}

export async function retrieveContextualMemories(workspaceId: string, query: string, context: Record<string, unknown> = {}, limit = 8) {
  const { workspace } = await getAuthorizedWorkspace(workspaceId);
  const sql = db();
  const rows = await sql`
    select id, text, category, confidence, relevance, lifecycle_state, confirmed,
           scope, provenance, source, created_at, updated_at, last_confirmed_at, last_retrieved_at
    from memories
    where workspace_id=${workspace.id}
      and lifecycle_state in ('active','dormant')
      and active=true
      and confidence >= 5
    order by updated_at desc
    limit 80
  `;

  const tokens = String(query).toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const contextTokens = JSON.stringify(context).toLowerCase().split(/\W+/).filter((token) => token.length > 3);
  const now = Date.now();
  const scored = rows.map((row) => {
    const text = String(row.text).toLowerCase();
    const scope = JSON.stringify(row.scope ?? {}).toLowerCase();
    const lexical = tokens.reduce((score, token) => score + (text.includes(token) ? 3 : 0), 0);
    const contextual = contextTokens.reduce((score, token) => score + (scope.includes(token) ? 2 : 0), 0);
    const confidence = Number(row.confidence) / 100;
    const relevance = Number(row.relevance) / 100;
    const ageDays = Math.max(0, (now - new Date(String(row.updated_at)).getTime()) / 86400000);
    const recency = 1 / (1 + ageDays / 30);
    const dormantPenalty = row.lifecycle_state === "dormant" ? 0.82 : 1;
    const score = (lexical + contextual + confidence * 2 + relevance * 2 + recency) * dormantPenalty;
    return { row, score };
  }).filter((item) => item.score >= 1.5).sort((a, b) => b.score - a.score).slice(0, Math.max(1, Math.min(limit, 20)));

  if (scored.length) {
    await Promise.all(scored.map(({ row }) => sql`
      update memories set last_retrieved_at=now(), updated_at=updated_at where id=${row.id} and workspace_id=${workspace.id}
    `));
    await Promise.all(scored.map(({ row }) => sql`
      insert into memory_events (memory_id, workspace_id, user_id, event_type, confidence_before, confidence_after, relevance_before, relevance_after, lifecycle_before, lifecycle_after, source, metadata)
      values (${row.id}, ${workspace.id}, (select owner_user_id from workspaces where id=${workspace.id}), 'retrieved', ${row.confidence}, ${row.confidence}, ${row.relevance}, ${row.relevance}, ${row.lifecycle_state}, ${row.lifecycle_state}, 'contextual-retrieval', ${JSON.stringify({ score: Number((scored.find((item) => item.row.id === row.id)?.score ?? 0).toFixed(3)) })}::jsonb)
    `));
  }
  return scored.map(({ row, score }) => ({ ...rowToMemory(row as Record<string, unknown>), retrievalScore: Number(score.toFixed(3)) }));
}

export async function createMemory(input: {
  workspaceId: string;
  text: string;
  category?: string;
  confidence?: number;
  relevance?: number;
  source?: string;
  scope?: MemoryScope;
  provenance?: Record<string, unknown>;
  confirmed?: boolean;
}) {
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId);
  const text = input.text.trim();
  if (!text) throw new Error("Memory text is required");
  const sql = db();
  const existing = await sql`
    select * from memories
    where workspace_id=${workspace.id} and lower(text)=lower(${text}) and lifecycle_state in ('active','dormant')
    limit 1
  `;
  if (existing[0]) {
    const before = Number(existing[0].confidence);
    const relevanceBefore = Number(existing[0].relevance);
    const after = Math.min(99, before + 8);
    const relevanceAfter = Math.min(100, relevanceBefore + 4);
    const lifecycle = existing[0].lifecycle_state === 'dormant' ? 'active' : existing[0].lifecycle_state;
    const updated = await sql`
      update memories set confidence=${after}, relevance=${relevanceAfter}, lifecycle_state=${lifecycle}, active=true, last_confirmed_at=now(), updated_at=now()
      where id=${existing[0].id} and workspace_id=${workspace.id}
      returning *
    `;
    await sql`
      insert into memory_events (memory_id, workspace_id, user_id, event_type, confidence_before, confidence_after, relevance_before, relevance_after, lifecycle_before, lifecycle_after, source)
      values (${existing[0].id}, ${workspace.id}, ${userId}, ${lifecycle === 'active' && existing[0].lifecycle_state === 'dormant' ? 'reactivated' : 'reinforced'}, ${before}, ${after}, ${relevanceBefore}, ${relevanceAfter}, ${existing[0].lifecycle_state}, ${lifecycle}, ${input.source ?? 'conversation'})
    `;
    return rowToMemory(updated[0] as Record<string, unknown>);
  }

  const confidence = Math.max(5, Math.min(100, Math.round(input.confidence ?? 60)));
  const relevance = Math.max(0, Math.min(100, Math.round(input.relevance ?? 50)));
  const inserted = await sql`
    insert into memories (user_id, workspace_id, text, category, confidence, source, confirmed, active, last_confirmed_at, provenance, scope, relevance, lifecycle_state, updated_at)
    values (${userId}, ${workspace.id}, ${text}, ${input.category ?? 'other'}, ${confidence}, ${input.source ?? 'conversation'}, ${Boolean(input.confirmed)}, true, now(), ${JSON.stringify(input.provenance ?? { type: 'conversation', userId })}::jsonb, ${JSON.stringify({ ...(input.scope ?? {}), workspace: workspace.id })}::jsonb, ${relevance}, 'active', now())
    returning *
  `;
  const memory = rowToMemory(inserted[0] as Record<string, unknown>);
  await sql`
    insert into memory_events (memory_id, workspace_id, user_id, event_type, confidence_before, confidence_after, relevance_before, relevance_after, lifecycle_before, lifecycle_after, source)
    values (${memory.id}, ${workspace.id}, ${userId}, 'created', null, ${confidence}, null, ${relevance}, null, 'active', ${input.source ?? 'conversation'})
  `;
  return memory;
}

export async function applyMemoryFeedback(input: {
  workspaceId: string;
  memoryId: string;
  signal: "confirm" | "contradict" | "useful" | "not_useful" | "reactivate" | "supersede" | "dismiss";
  note?: string;
  recommendationOutcomeId?: string;
}) {
  const { userId, workspace } = await getAuthorizedWorkspace(input.workspaceId);
  const sql = db();
  const rows = await sql`
    select * from memories where id=${input.memoryId} and workspace_id=${workspace.id} and user_id=${userId} limit 1
  `;
  if (!rows[0]) throw new Error("Memory not found");
  const before = rows[0];
  const confidenceBefore = Number(before.confidence);
  const relevanceBefore = Number(before.relevance);
  let confidence = confidenceBefore;
  let relevance = relevanceBefore;
  let lifecycle = String(before.lifecycle_state);
  let eventType: "confirmed" | "rejected" | "feedback" | "reactivated" | "superseded" = "feedback";
  if (input.signal === "confirm" || input.signal === "useful") {
    confidence = Math.min(99, confidence + 12);
    relevance = Math.min(100, relevance + 8);
    lifecycle = "active";
    eventType = input.signal === "confirm" ? "confirmed" : "feedback";
  } else if (input.signal === "contradict") {
    confidence = Math.max(5, confidence - 25);
    relevance = Math.max(0, relevance - 10);
    lifecycle = confidence <= 25 ? "dormant" : "active";
  } else if (input.signal === "not_useful") {
    relevance = Math.max(0, relevance - 20);
  } else if (input.signal === "reactivate") {
    lifecycle = "active";
    relevance = Math.max(relevance, 60);
    eventType = "reactivated";
  } else if (input.signal === "dismiss") {
    lifecycle = "rejected";
    eventType = "rejected";
  } else if (input.signal === "supersede") {
    lifecycle = "superseded";
    eventType = "superseded";
  }
  const updated = await sql`
    update memories set confidence=${confidence}, relevance=${relevance}, lifecycle_state=${lifecycle}, active=${lifecycle === 'active' || lifecycle === 'dormant'}, updated_at=now(), last_confirmed_at=${input.signal === 'confirm' || input.signal === 'useful' ? sql`now()` : sql`last_confirmed_at`}
    where id=${input.memoryId} and workspace_id=${workspace.id} and user_id=${userId}
    returning *
  `;
  await sql`
    insert into memory_feedback (memory_id, recommendation_outcome_id, workspace_id, user_id, signal, note)
    values (${input.memoryId}, ${input.recommendationOutcomeId ?? null}, ${workspace.id}, ${userId}, ${input.signal}, ${input.note ?? null})
  `;
  await sql`
    insert into memory_events (memory_id, workspace_id, user_id, event_type, confidence_before, confidence_after, relevance_before, relevance_after, lifecycle_before, lifecycle_after, source, metadata)
    values (${input.memoryId}, ${workspace.id}, ${userId}, ${eventType}, ${confidenceBefore}, ${confidence}, ${relevanceBefore}, ${relevance}, ${before.lifecycle_state}, ${lifecycle}, 'user-feedback', ${JSON.stringify({ signal: input.signal, note: input.note ?? null })}::jsonb)
  `;
  return rowToMemory(updated[0] as Record<string, unknown>);
}
