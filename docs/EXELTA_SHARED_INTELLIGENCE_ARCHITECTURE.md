# Exelta — unified product architecture

## Product identity

**Exelta is the product, the experience, and the user-facing intelligence.** Legacy XIO, Astara, Zuna, ZIO, and Zioren names are retired from user-facing product language. Historical API routes, database tables, component names, and deployment identifiers may remain temporarily where changing them would risk compatibility; they are implementation details, not separate products.

## Core experience

Exelta is a living intelligence universe, not a dashboard, widget grid, prompt library, or generic chatbot. Its spatial interface uses fields, nodes, relationships, depth, light, and transitions to make real system state legible. Motion must correspond to actual listening, retrieval, reasoning, verification, approval, or learning; decorative animation must not imply work that did not happen.

The visual direction should be luminous and high-dimensional rather than uniformly dark: paper and pearl surfaces with deep midnight depth, Signal Violet (#7C5CFF), Memory Cyan (#27D7C5), and carefully controlled luminous highlights. Use dimensional 3D forms, atmospheric parallax, layered translucency, rich spatial composition, and responsive motion. Preserve readability, accessibility, responsive layouts, and reduced-motion preferences.

## Five-minute wow

The arrival experience should demonstrate a real cognitive loop, not merely introduce features:

1. Establish the user's intention and current context.
2. Ask permission before persisting personal information.
3. Store approved memories with source, captured time, scope, confidence, and lifecycle.
4. Transition to a different task/context.
5. Retrieve a relevant memory only when context matches.
6. Re-evaluate provenance, freshness, confidence, scope, and conflicts before influence.
7. Show the user why the memory resurfaced and let them inspect or correct it.

The arrival must transition into the same working environment; it must not end at an onboarding card and dump the user into a conventional dashboard.

## Memory Fabric

Memory is persistent, user-controlled, and distinct from belief, pattern, insight, and recommendation. Records preserve context, scope, provenance, confidence, relationships, consent, timestamps, permissions, and lifecycle. Dormant memories can be reconsidered when relevant context returns, but retrieval never implies automatic influence. Insufficiently sourced, stale, out-of-scope, or conflicting memories fail closed pending review.

Research evidence remains separate from memory until an explicit, governed memory-capture action occurs. User inspection, correction, suppression, export, and deletion are required controls.

## Intelligent Core

The orchestration loop is:

`INTENT → CONTEXT → MEMORY → REASONING → ACTION → RESULT → FEEDBACK → LEARNING → MEMORY`

The system assembles context, retrieves eligible memories and source-backed evidence, evaluates relevance and confidence, coordinates specialized capabilities, applies governance and approval boundaries, verifies outcomes, and records permitted learning.

## Compatibility

Do not rename API paths, database identifiers, auth claims, or deployment resource names in a blind global replacement. Consolidate all user-visible copy, metadata, onboarding, documentation, and public brand surfaces under Exelta while preserving internal contracts until a separately tested migration is justified.
