# Sanctum Baseline v0 — Architecture & Schema Contract

## Status

**Baseline branch:** `sanctum/baseline-v0`  
**Parent:** `a9a808dc1922c9b4d5e7b32b4cb75d0622dea2b2`  
**Authority:** `ZYOVERSE_MASTER_SOURCE_OF_TRUTH.md`  
**Purpose:** establish the pre-build contract for Sanctum before application implementation changes.

## Architectural decision

Sanctum is a synthesis of:

1. the integrated Xioeffect application/runtime;
2. the stronger control-plane primitives demonstrated by the ZIO 5.8 implementation;
3. the semantic requirements in the master specification.

Neither historical ZIP is treated as a production-ready implementation.

## Core invariants

1. **Memory is not belief, pattern, insight, or recommendation.**
2. Every durable memory has provenance, scope, confidence, lifecycle, and timestamps.
3. Retrieval never implies applicability. A candidate must pass contextual re-evaluation before influencing reasoning.
4. Dormant memory remains retrievable but is never treated as active without re-evaluation/reactivation.
5. Contradictions are first-class records, not merely confidence adjustments.
6. Research evidence is distinct from Memory.
7. Work Graph entities are first-class relational objects; JSON is metadata, not the graph model.
8. Every recommendation/action lineage can be traced back to evidence and memory inputs.
9. User/workspace authorization is enforced before reads and writes.
10. Destructive or externally consequential actions require explicit governance state.
11. No subsystem may claim semantic retrieval, autonomous execution, or provider connectivity without a real implementation and verification gate.

---

# 1. Contextual Memory contract

## Memory

A Memory is a durable user/workspace-scoped proposition or preference retained for possible future use.

Required fields:

- id
- user_id
- workspace_id
- text
- category
- scope
- confidence
- relevance
- lifecycle_state
- provenance
- source
- created_at
- updated_at
- last_confirmed_at
- last_retrieved_at

Lifecycle:

`active | dormant | review | superseded | invalidated | archived | rejected`

## Scope

Scope is represented by explicit dimensions rather than an opaque JSON-only contract:

- workspace
- project
- goal
- conversation
- entity
- tags
- valid_from
- valid_until
- contextual predicates

JSON metadata may supplement these fields but cannot be the only representation of applicability.

## Provenance

Every memory must identify:

- source type
- source identifier
- source event/document/conversation
- author/actor where applicable
- extraction method
- creation timestamp
- supporting evidence references
- supersession/contradiction relationships where applicable

---

# 2. Retrieval and re-evaluation contract

Retrieval is a pipeline, not a SQL query.

```
query/context
    ↓
candidate retrieval
    ↓
authorization + workspace isolation
    ↓
scope matching
    ↓
freshness evaluation
    ↓
confidence / relevance
    ↓
authority / provenance
    ↓
contradiction detection
    ↓
contextual re-evaluation
    ↓
applicability decision
    ↓
ranked usable memories
```

A retrieval result must carry an explicit decision:

`relevant | stale | contradicted | out_of_scope | review_required | usable`

The existing lexical/contextual scorer remains a baseline implementation, not the final semantic contract.

The retrieval interface should be provider-neutral:

```ts
type MemoryRetrievalRequest = {
  workspaceId: string;
  query: string;
  context: Record<string, unknown>;
  limit?: number;
};

type MemoryCandidateDecision =
  | "relevant"
  | "stale"
  | "contradicted"
  | "out_of_scope"
  | "review_required"
  | "usable";

type MemoryRetrievalResult = {
  memoryId: string;
  retrievalScore: number;
  decision: MemoryCandidateDecision;
  reasons: string[];
  provenance: Record<string, unknown>;
};
```

Semantic/vector retrieval may be added behind the same interface. No provider is hard-coded into the Memory domain.

---

# 3. Contradiction contract

Contradiction must be represented separately from Memory confidence.

A contradiction record contains:

- id
- workspace_id
- memory_id
- conflicting_memory_id or evidence_id
- detected_by
- severity
- status
- explanation
- created_at
- resolved_at
- resolution

Statuses:

`open | acknowledged | resolved | dismissed`

Resolution may:

- confirm the original memory;
- confirm the newer memory;
- supersede one memory with another;
- send the memories to review;
- invalidate one or both.

A `contradict` feedback signal may update confidence, but it must also create/resolve a contradiction record where a specific conflicting proposition exists.

---

# 4. Work Graph contract

Work Graph is the persistent relationship layer connecting intelligence to the user's work.

Node types:

`person | project | goal | task | decision | document | conversation | outcome | organization | source`

Edge types are explicit and directional, for example:

`belongs_to | depends_on | supports | contradicts | derived_from | assigned_to | related_to | supersedes | resulted_in`

Minimum node fields:

- id
- workspace_id
- type
- title
- summary
- metadata
- created_at
- updated_at
- archived_at

Minimum edge fields:

- id
- workspace_id
- source_node_id
- target_node_id
- relation
- confidence
- provenance
- created_at

The graph must preserve workspace isolation and must not rely on unbounded JSON traversal.

---

# 5. Provenance ledger contract

A unified provenance ledger connects:

`source → evidence → memory → insight → recommendation → action → outcome`

Ledger entries should be append-oriented and immutable in meaning.

Required fields:

- id
- workspace_id
- subject_type
- subject_id
- event_type
- source_type
- source_id
- actor_type
- actor_id
- metadata
- created_at

Corrections are new ledger events, not silent mutation of history.

---

# 6. Research boundary

Research is not Memory.

Research/source data may contain:

- repository
- commit
- file
- source chunk
- document
- external evidence
- extraction metadata

Memory may cite Research evidence, but Research remains independently addressable and deletable.

Canonical lineage:

`source → chunk/evidence → research finding → optional memory`

A research finding must not automatically become a memory without the memory admission policy.

---

# 7. Recommendation contract

Recommendation is downstream of memory and evidence.

A recommendation must preserve:

- recommendation id
- workspace
- input evidence references
- input memory references
- reasoning/provenance metadata
- confidence
- risk classification
- created_at
- status
- outcome reference

Recommendation status:

`proposed | approved | rejected | executed | expired | superseded`

Recommendations are not actions.

---

# 8. Governance / action boundary

Any externally consequential action follows:

```
recommendation
    ↓
risk classification
    ↓
governance decision
    ↓
approval if required
    ↓
action intent
    ↓
idempotent execution
    ↓
verification
    ↓
outcome
```

Action execution requires:

- idempotency key
- execution state
- lease/ownership
- retry state
- external reference where applicable
- result/error
- verification state

The system must fail closed when governance state is missing or ambiguous.

---

# 9. Initial relational target

The existing `memories`, `memory_events`, `memory_feedback`, users, workspaces, conversations, and GitHub/Research structures remain the migration starting point.

Sanctum should add or evolve toward:

```
memory_scopes
memory_evidence
memory_contradictions
memory_reviews

work_graph_nodes
work_graph_edges

provenance_ledger

research_sources
research_chunks
research_findings

recommendations
recommendation_inputs
recommendation_outcomes

governance_decisions

action_intents
action_executions
action_execution_attempts
```

Do not create all of these tables blindly in one migration. Implement dependency-ordered vertical slices with tests.

---

# 10. Dependency order

### Slice A — Contextual Memory kernel
- normalize scope
- retrieval contract
- re-evaluation decisions
- contradiction records
- provenance references
- migration tests

### Slice B — Work Graph
- nodes
- edges
- authorization
- memory/evidence references

### Slice C — Research lineage
- source
- chunk
- finding
- evidence linkage

### Slice D — Recommendation lineage
- recommendation
- inputs
- outcomes
- provenance

### Slice E — Governance
- risk
- approval
- governance decision

### Slice F — Action execution
- intent
- idempotency
- leases
- retries
- verification

Shadow/simulation remains downstream of these contracts.

---

# 11. Non-goals for this phase

Do not yet:

- rewrite the entire UI;
- replace the authentication layer;
- add a second runtime;
- claim semantic search without a real provider;
- implement broad autonomous execution;
- introduce Shadow as a parallel architecture;
- duplicate existing Memory CRUD;
- collapse Research into Memory;
- migrate every historical table at once.

---

# 12. Definition of done for the schema/contract phase

Before implementation proceeds, the branch must have:

- explicit Memory domain contract;
- explicit contextual re-evaluation contract;
- explicit contradiction model;
- explicit Work Graph model;
- explicit provenance model;
- Research/Memory boundary;
- recommendation/action boundary;
- migration dependency order;
- authorization invariants;
- tests planned for each invariant.

Only after these contracts are stable should database migrations and application code begin.
