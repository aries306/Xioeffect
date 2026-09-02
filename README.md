# XIO

XIO is transitioning from a browser-only demo to a server-backed SaaS application.

## Current state

- `/` embeds the existing demo unchanged
- `/api/health` is a deployment health endpoint
- `/api/chat` validates input and intentionally returns `503` until authentication, data access, and AI Gateway are configured
- GitHub integration is implemented on the `feat/github-nexus` branch behind authenticated server routes

## GitHub → Research → NEXUS

The GitHub integration uses the authenticated Clerk user as the ownership boundary:

1. `/api/github/connect` starts GitHub OAuth with CSRF state and PKCE S256.
2. `/api/github/callback` exchanges the one-time authorization code, validates the GitHub identity, and stores tokens only server-side using AES-256-GCM encryption.
3. Expiring GitHub access tokens are refreshed with the encrypted refresh token when available.
4. `/api/github/repositories` exposes only the authenticated user's repositories and lets the user select which repositories XIO may index.
5. `/api/github/sync` performs incremental repository synchronization using branch-head and blob SHAs, filters generated/binary content, and records failures without leaking tokens.
6. Each changed source document becomes a provenance-backed Research record and a deduplicated NEXUS ingest event.
7. `/api/nexus/research` exposes the authenticated user's Research records and lets the NEXUS layer enqueue additional processing events.
8. `/api/github/connection` supports connection status and disconnect; deleting the connection cascades repository/document state from the GitHub integration.

Research remains separate from Memory. GitHub source material is evidence; Research records preserve source provenance; downstream NEXUS processing must not automatically become a Memory, belief, pattern, insight, or recommendation.

Every Research provenance record should retain repository, branch, commit SHA, path, blob SHA, content hash, source URL, and retrieval time so downstream reasoning can be re-evaluated against the original source.

## GitHub security

The current implementation uses a GitHub OAuth App with `repo`, `read:user`, `user:email`, and `offline_access`. `repo` is intentionally broad because OAuth Apps do not provide the same fine-grained repository permission model as GitHub Apps. The long-term production hardening path is a GitHub App with read-only Contents/Metadata permissions.

GitHub client credentials, encryption keys, access tokens, refresh tokens, and database credentials are server-side only. Never expose them to the browser, logs, Research content, or NEXUS payloads.

## Environment

Required server-side variables:

```text
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
DATABASE_URL=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_REDIRECT_URI=
GITHUB_TOKEN_ENCRYPTION_KEY=
```

Generate the token-encryption key as a base64-encoded 32-byte value. Register the exact `GITHUB_REDIRECT_URI` in the GitHub OAuth App.

## Database

Apply `db/migrations/001_xio_core.sql` first, then `db/migrations/002_github_nexus.sql`. The GitHub migration is upgrade-safe for the integration tables and adds encrypted token lifecycle fields, repository selection/sync state, provenance indexes, and NEXUS event deduplication.

Every user-owned query must be scoped by the verified Clerk user ID. The GitHub integration uses text `user_id` values because Clerk user IDs are strings.

## Production verification

Before merging/deploying the GitHub branch:

- run `npm install`
- run `npm run typecheck`
- run `npm run lint`
- run `npm run build`
- verify the OAuth callback rejects missing/incorrect state, missing PKCE verifier, and mismatched authenticated users
- complete a real GitHub authorization with a test account
- verify no access or refresh token is returned to the browser
- verify repository selection and disconnect behavior
- sync a small repository and verify provenance-backed Research records and deduplicated NEXUS events
- repeat sync without a new commit and confirm it is a no-op
- push a new commit and confirm only changed blobs are re-indexed
- test access-token refresh and expired/invalid refresh-token failure handling
- verify account deletion removes GitHub connection data through the same ownership boundary

## Data model and privacy

`db/migrations/001_xio_core.sql` models users, preferences, memories, goals, conversations, messages, events, and subscription state. The application server must scope every query by the verified authenticated user ID. Never expose `DATABASE_URL`, Stripe secrets, or AI credentials to the browser.

The product must retain the demo's privacy controls: consent before memory creation, per-memory edit/delete, account export, account deletion, and a learning pause. Contextual Memory must remain distinct from Research and other derived knowledge: memories retain provenance, scope, confidence, and lifecycle, and should be re-evaluated before influencing recommendations when their original context returns.

## Billing and AI configuration

Subscription changes must originate with Stripe Checkout and be applied only from verified Stripe webhook events. The checkout and webhook routes are intentionally fail-closed until Stripe credentials, price IDs, and webhook signing verification are installed. AI requests must be executed server-side through Vercel AI Gateway only after authentication, entitlement checks, rate limits, and consented-memory retrieval are enabled.

## Authentication

Clerk is connected to the application. `/sign-up` and `/sign-in` provide hosted account creation and login; `/app` and sensitive API routes are protected by verified Clerk sessions. The existing browser demo remains isolated from personal cloud data until the Neon-backed data layer is implemented.
