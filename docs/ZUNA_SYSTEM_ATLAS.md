# Zuna System Atlas
## Consolidated product, architecture, implementation, and launch reference

**Purpose.** This document consolidates the Zuna-related project material into one navigable source of truth. It distinguishes product intent, architecture, implementation evidence, and release verification. It does not treat a historical handoff or a successful build as proof of live behavior.

**Canonical implementation baseline:** `aries306/Xioeffect`  
**Governing product/specification repository:** `aries306/zunoverse` (ZYOVERSE)  
**Experience names used in source material:** Zuna, Vea, Sanctum, Genesis/ZIO  
**Current review branch:** `feat/zuna-unified-atlas-voice-3d`

---

## 1. Executive definition

Zuna is an evolving, user-directed intelligence environment. It should help a person make their world more coherent over time by connecting goals, context, memory, research, reasoning, agents, knowledge, insights, and outcomes.

The environment is the interface to the system, not a substitute for the system. Visual effects must represent actual data and runtime state. A memory is not automatically a belief; research is not memory; a pattern is not an insight; and an insight is not a recommendation.

### Product promise

- Meet the user in a calm, spatial environment.
- Let the user express an intention naturally, by voice or text.
- Respond conversationally and, when enabled, speak the response aloud.
- Carry forward only information the user authorizes or has consented to store.
- Retrieve contextual information only when its scope and current relevance support its use.
- Explain where information came from and why it is or is not influencing an answer.
- Turn eligible evidence into reasoning, recommendations, actions, and learning loops.

### Experience sequence

The original Vea/Sanctum concept defines this progression:

1. Cinematic arrival into a dark, near-black environment.
2. Meet Vea, the conversational intelligence at the center of the experience.
3. Ask the visitor what to call them and invite them to describe who they are.
4. Let their words form visible concepts and relationships in the environment.
5. Deliver a short “5-Minute Wow” that demonstrates real contextual intelligence.
6. Transition into the wider Zuna application and its workspace.

The cinematic is the threshold into Zuna, not the whole product.

---

## 2. Source-of-truth hierarchy

Use this hierarchy when sources disagree:

1. **ZYOVERSE master specification** — governing product intent, system principles, user control, and acceptance criteria.
2. **Current Xioeffect `main` branch** — canonical application runtime and implementation evidence.
3. **Current tests, migrations, deployment records, and authenticated runtime observations** — evidence of what actually works.
4. **Zuna ZIP packages and earlier Floot work** — historical implementation and design material; reuse selected ideas/assets, not whole overlapping applications.
5. **Project handoff documents** — useful chronology and decisions, but their status statements can become stale.

### Historical source packages

- `zuna-vea-first-real-build.zip`: historical evidence for Memory Fabric schema, authenticated memory APIs, text retrieval, chat, onboarding, and a first-build guide.
- `zuna-implemented-project.zip`: historical evidence for Vea/Zuna experience components, cinematic assets, pricing, Stripe scaffolding, and overlapping app files.
- Earlier Floot implementation: a dark arrival, Three.js particle treatment, Vea speech pulse, onboarding and a 5-minute experience. It is not the current canonical runtime.

**Decision:** preserve useful source material; do not wholesale-merge the archives or reintroduce Floot as a second runtime.

---

## 3. Product map

| Domain | Purpose | Key distinction |
|---|---|---|
| Zuna | The user-facing evolving intelligence environment | Product/environment, not a single model |
| Vea | Conversational guide/persona used in the arrival experience | Interface/persona, not the entire cognitive system |
| Genesis / ZIO | Current living-universe front door in Xioeffect | Experience layer over workspace capabilities |
| Sanctum | Spatial memory/context experience | Must show actual evaluated state |
| Memory Fabric | User-owned, persistent contextual memory | Memory is not belief or truth |
| Contextual Memory | Retain useful memories beyond their original conversation; retrieve when relevant context returns | Dormant does not mean deleted or universally applicable |
| Research | Source-backed external or connected information | Evidence is not personal memory |
| NEXUS | Ingestion/event and downstream processing layer | Processing does not automatically create memory or insight |
| Avenne | Reasoning/orchestration path that consumes eligible evidence | Recommendation must be traceable to evidence |
| Agents | Specialized delegated capabilities | Actions require permissions and appropriate boundaries |
| Knowledge | Organized information available to the workspace | Keep provenance and source lineage |
| Patterns | Repeated structures inferred from evidence | A pattern is a derived hypothesis, not a fact |
| Insights | Higher-order interpretation of patterns/evidence | Keep derivation and confidence visible |
| Goals / Projects | User intentions and work context | Scope context and lifecycle explicitly |
| Trust / Governance | Consent, permissions, provenance, evaluation, auditability | Trust is a system property, not a decorative label |
| Billing | Subscription state and entitlement controls | Stripe webhooks, not client-side claims, govern paid state |

---

## 4. Cognitive architecture

### Core evidence-to-action loop

```text
User input (voice or text)
        |
        v
Conversation / task context
        |
        v
Candidate extraction
        |
        +------> Research ingestion (separate evidence stream)
        |
        v
Memory candidate (only with consent/authorized policy)
        |
        v
Contextual storage + provenance + scope + lifecycle
        |
        v
Context-aware retrieval
        |
        v
Provenance validation
        |
        v
Scope and context validation
        |
        v
Staleness / confirmation check
        |
        v
Confidence / relevance / contradiction evaluation
        |
        v
Eligible evidence only
        |
        v
Avenne reasoning
        |
        v
Recommendation / response
        |
        v
Outcome and user feedback
        |
        v
Re-evaluation and learning
```

### Contextual Memory principles

- Important memories do not disappear merely because their original conversation ends.
- A memory retains its original context, scope, provenance, confidence, and lifecycle.
- It may become dormant when its context is no longer active.
- It may be retrieved when a sufficiently related context returns.
- Retrieval is not trust: every candidate is re-evaluated before it can influence reasoning.
- Context should be modeled across project, goal, task, conversation, and applicable conditions.
- A stale, out-of-scope, weakly sourced, malformed, or review-required memory must not influence the current response.
- User inspection, correction, deletion, export, and learning controls are part of the product—not optional admin features.

### Memory vs. derived knowledge

| Object | Meaning | Required treatment |
|---|---|---|
| Memory | User-related information intentionally retained | Preserve source, context, scope, confidence, lifecycle and consent |
| Research | Information retrieved from an external or connected source | Preserve URL/repository, commit/path or source lineage, retrieval time and content identity |
| Belief | A proposition the system currently treats as supported | Show supporting and conflicting evidence; do not equate with memory |
| Pattern | A recurring structure inferred from multiple observations | Show derivation, sample basis and uncertainty |
| Insight | A useful interpretation derived from evidence/patterns | Preserve its derivation and confidence |
| Recommendation | A proposed action or decision | Trace to eligible evidence and current user goal |
| Outcome | What happened after a recommendation/action | Feed back only through appropriate, user-governed learning |

### Contradiction handling

A possible conflict is not a confirmed contradiction. Preserve both claims and their provenance. A user-confirmed contradiction creates an explicit relationship and triggers evaluation. Neither claim should influence the relevant task while it is under review unless the evaluation contract explicitly allows a safe, scoped use.

---

## 5. Application architecture

The current canonical application is Xioeffect, a Next.js 16 application using Clerk authentication and Postgres-backed workspace data. The repository also contains a Vinext/Cloudflare alternate runtime. The checked `package.json` on the inspected `main` commit uses Next.js as the default scripts; the README still describes Vinext as the default. Resolve that documentation/runtime discrepancy before standardizing deployment instructions.

### Main application responsibilities

- **Clerk:** identity and authenticated session boundary.
- **Workspace layer:** user/workspace ownership and authorization.
- **Postgres:** persistence for workspace, memory, research, conversations and related state.
- **Memory API:** create, retrieve, evaluate and manage user-owned memories.
- **AI Gateway:** server-side model calls; never expose gateway credentials in browser code.
- **Avenne:** response orchestration and contextual evidence use.
- **GitHub integration:** OAuth, repository selection, incremental source sync, provenance-backed Research records and NEXUS events.
- **NEXUS:** deduplicated ingestion/processing events.
- **Stripe:** billing/entitlements only after verified webhook configuration.
- **Sanctum / Genesis / Atlas:** visual and interaction layers over the actual application APIs.

### Current repository observations

- Repository: `aries306/Xioeffect`
- Inspected `main` commit: `6610a4ec15beae2b5144459e3120c6c2acdc4c86`
- Node target: 24.x in the linked Vercel project
- Runtime framework in Vercel: Next.js
- Current production deployment observed: `xioeffect-3pbqca0fx-a-9602.vercel.app`, state `READY`
- PR #25 (Memory Fabric hardening and Sanctum integration): merged as `793b4bf1a1d4a836a40aa6c3ef0371fec0608746`
- Migration sequence in repository: 001 through 006, with 006 adding memory relations/evaluation structures.

These are repository/deployment metadata observations, not proof of authenticated end-to-end correctness.

---

## 6. Current implementation inventory

The following reflects source inspection and the recorded pull request/deployment state. “Present” means code or route exists; it does not mean every production behavior has passed.

| Capability | Evidence / location | Current assessment |
|---|---|---|
| Authenticated workspace | Clerk and workspace API | Foundation present |
| Chat endpoint | `app/api/chat/route.ts` | Calls Avenne and persists conversation; runtime/credentials must be checked |
| AI Gateway | `lib/ai.ts` | Server-side integration exists; local fallback can return a non-model response if no gateway key is configured |
| Memory persistence | `lib/memory.ts`, `app/api/memory` | Foundation present |
| Contextual evaluation | `lib/memory-evaluation.ts`, evaluation API | Safety gates implemented in merged PR #25 |
| Memory relationships | Migration 006 and feedback API | Explicit relation model present |
| Memory export | PR #25 changes | Includes evaluation snapshots, events, feedback and relations |
| Research / GitHub sync | GitHub routes and `lib/github.ts` | Implementation present; live OAuth/sync needs runtime validation |
| NEXUS ingestion | NEXUS API and event model | Implementation present; verify downstream processing boundaries |
| Sanctum | `/sanctum` and `components/sanctum` | Existing spatial/visual experience; memory evaluation is surfaced |
| Genesis front door | `components/genesis/GenesisExperience.tsx` | Current public living-universe experience |
| 3D interaction | Current Genesis source uses a 2D canvas starfield and CSS constellation/orbits | True 3D spatial interaction remains a gap |
| Voice output | Sanctum source uses browser `speechSynthesis` | Speech output only; not voice-to-voice |
| Voice input | No speech-recognition path found in inspected Genesis/Sanctum source | Gap to close |
| Billing | Stripe scaffolding and fail-closed checkout/webhook notes | Not to be represented as live until secrets, prices and verified webhook flow are proven |
| Core Acceptance Test | Credential-gated integration test described in PR #25 | Authenticated live context-switch test remains unverified |

### Important voice distinction

Speech synthesis (“read this answer aloud”) is not voice-to-voice. A complete voice loop needs:
1. Microphone permission and speech recognition/transcription.
2. Authenticated submission to the same AI/chat endpoint as text.
3. Response playback using speech synthesis or a configured speech service.
4. Interrupt/stop controls, clear listening/speaking state, transcript visibility and a text fallback.
5. Explicit indication when browser support, model credentials or network access are unavailable.

The initial Atlas preview implements a browser-native voice loop over the existing authenticated chat API. Production-grade streaming speech, interruption handling and server-managed voice identity can be layered in after the core loop is validated.

### Current preview branch additions (not yet merged to main)

The review branch `feat/zuna-unified-atlas-voice-3d` adds an `/atlas` surface:
- A pointer-responsive 3D-projected particle sphere, perspective depth, orbital geometry and selectable system nodes. This is a lightweight canvas projection/CSS 3D composition, not a Three.js/WebGL scene.
- Browser-native speech recognition for microphone input, the existing authenticated `/api/chat` endpoint for the AI turn, and browser speech synthesis for spoken replies.
- Visible transcript, text fallback, voice-reply toggle, listening/speaking states and a stop-audio control.
- A direct link from the Genesis front door and this consolidated Atlas document.

These features are preview-branch code only until the pull request is reviewed and merged. The voice loop still depends on browser API support, microphone permission, a valid authenticated workspace, and a configured live AI Gateway. If the app uses its documented local fallback, the response is not a real model-generated answer.

---

## 7. Experience and interaction requirements

### Visual direction

- Deep black / near-black foundation.
- Restrained cosmic depth, soft nebula lighting, luminous nodes and spatial relationships.
- A central intelligence presence, with surrounding systems represented as meaningful nodes.
- Motion responds to actual activity and state, not arbitrary decoration.
- Clear hierarchy and accessible contrast.
- Reduced-motion support and responsive layout.
- Text and conventional controls remain available; the 3D scene must not be the only way to navigate.

### Primary spatial nodes

Memory · Learning · Projects · Intelligence · Agents · Knowledge · Insights · Trust · Research · NEXUS · Avenne · Goals · Outcomes.

The interface should distinguish live/connected modules from architectural concepts that are not yet operational.

### Conversation

- Text and voice are both first-class inputs.
- User can start/stop listening.
- User can interrupt speech playback.
- Transcript and AI response remain visible.
- Voice mode can be disabled.
- Microphone denial or unsupported browser must degrade gracefully to text.
- The user should be able to inspect the supporting context for an answer.

---

## 8. Privacy, permissions and safety

- Every user-owned query is scoped to the verified Clerk user and authorized workspace.
- Secrets, access tokens, encryption keys, database credentials and AI credentials stay server-side.
- Do not silently create memory from onboarding or conversation when the user's preferences require confirmation.
- Respect learning pause and ask-before-memory settings.
- Memory evaluation writes require the permission level defined by the API (editor access where evaluation persists state/audit events).
- Export must include relevant user-owned Memory Fabric state, evaluation snapshots, events, feedback and relations, but never encrypted GitHub token material.
- Account deletion requires explicit confirmation and must respect the same ownership boundary.
- Do not weaken Vercel SSO, auth or deployment protections merely to make a test easier.

---

## 9. Verification and release truth

### What has been verified in source/deployment records

- PR #25 is merged.
- The latest inspected `main` branch is commit `6610a4ec15beae2b5144459e3120c6c2acdc4c86`.
- The linked Vercel project reports a production deployment in `READY` state for that commit.
- Vercel project SSO protection is enabled for non-custom domains.
- The Memory Fabric migration files 001–006 exist in the repository.
- The current Genesis experience loads workspace, Research and Memory data when authenticated.

### What is not established by those observations

- Whether migration 006 is applied to the actual production database.
- Whether the authenticated user can complete the full memory context-switch journey in production.
- Whether every provenance/scope/staleness/conflict case behaves correctly against the live database.
- Whether current production AI credentials invoke the model rather than the local fallback.
- Whether GitHub OAuth and incremental repository sync work end to end.
- Whether billing is configured and webhook-verified.
- Whether the browser-native voice loop is supported and usable across target devices.

### Core Acceptance Test

1. Sign in as a real test user.
2. Save an important memory with explicit user authorization.
3. Leave the original conversation/context.
4. Return in a related but different context.
5. Retrieve the memory and inspect its source, capture time, context, scope and derivation.
6. Confirm relevant, well-sourced memory can influence the response.
7. Introduce an out-of-scope memory and verify it is blocked.
8. Introduce stale or unconfirmed evidence and verify it is blocked or sent to review.
9. Introduce conflicting evidence; preserve both claims and their provenance.
10. Confirm a contradiction as the user and verify both records are review-gated with zero influence while unresolved.
11. Correct or delete a record and confirm the change is reflected.
12. Export the account data and verify the relevant Memory Fabric records are included without secrets.
13. Confirm the UI reports actual evaluator outcomes rather than simulated states.

### Release gates

- [ ] Build, typecheck, lint and automated tests pass on the preview branch.
- [ ] Vercel preview reaches READY.
- [ ] Preview is opened and reviewed by the user before production launch.
- [ ] Migration 006 is verified against the target database; no blind production migration.
- [ ] Authenticated Core Acceptance Test passes.
- [ ] AI Gateway is confirmed to use a real configured model.
- [ ] Voice input and spoken response are tested in supported browsers and devices.
- [ ] Accessibility, responsive layout and reduced motion are checked.
- [ ] Billing, OAuth, privacy/export/deletion paths are validated before enabling paid/public launch.
- [ ] Production launch is explicitly approved after preview review.

---

## 10. Consolidated build sequence

1. **Source-of-truth and baseline:** retain ZYOVERSE as specification and Xioeffect as canonical runtime; document differences between README and package scripts.
2. **Cognitive integrity:** preserve the provenance-first write → retrieval → re-evaluation → influence gate; test the full acceptance sequence.
3. **Unified experience:** connect Genesis/Sanctum/Atlas to actual workspace, memory, research and reasoning state.
4. **3D spatial interface:** implement responsive, accessible spatial navigation with true depth cues and meaningful state mapping.
5. **Voice-to-voice:** add browser speech recognition, authenticated AI request, spoken response, stop/interrupt and transcript controls; later consider streaming speech.
6. **User controls:** memory review/correction/deletion/export, consent, learning pause and provenance inspection.
7. **Release:** preview first, user review, runtime acceptance, then explicit production approval.

**Non-negotiable:** no production launch before the user has seen and approved the preview. A successful deployment is not the same as a verified product.

---

## 11. Glossary

- **Context:** the project, goal, task, conversation or conditions in which information applies.
- **Dormant memory:** retained memory that is not currently active/relevant but may become relevant when context returns.
- **Provenance:** inspectable origin and lineage of information.
- **Scope:** the boundary within which a memory or record is applicable.
- **Evaluation:** the decision about whether a retrieved item is eligible to influence the current task.
- **Influence weight:** the evaluated contribution an eligible item may make; review-only or ineligible items must not influence reasoning.
- **Research record:** source-backed information from a connected or external source.
- **NEXUS event:** a deduplicated ingestion/processing event.
- **Avenne:** the reasoning/orchestration path described by the project.
- **Sanctum / Genesis / Atlas:** successive spatial experience concepts and implementation surfaces for Zuna.

---

## 12. Source files reviewed

The consolidation is based on all 12 project documents available in this project:
- Designing Zuna’s Cognitive Space (source-of-truth comparison and truth matrix)
- Branch versions of Designing Zuna’s Cognitive Space (API logic, repo repairs, Sanctum implementation, verification and release status)
- Rename Floot Branding (historical cinematic arrival and Vea particle experience)

The repository checks were performed against Xioeffect `main`, its current package manifest, README, Genesis and Sanctum components, chat and AI routes, migrations, PR #25 metadata, and linked Vercel project/deployment metadata.

This Atlas is the consolidated project reference; it should be updated when a new implementation or acceptance result changes the verified state.
