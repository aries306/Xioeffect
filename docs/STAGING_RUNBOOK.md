# Exelta Staging Runbook

This document records the staging architecture and release gates. Do not use production credentials or production resources to satisfy a staging check.

## Verified infrastructure

| Resource | Value |
|---|---|
| GitHub repository | `aries306/Xioeffect` |
| Implementation PR | [#33](https://github.com/aries306/Xioeffect/pull/33) |
| Implementation branch | `fix/exelta-ui-brand-and-arrival-tests` |
| Staging Neon project | `exelta-staging` |
| Neon project ID | `fragrant-block-35529572` |
| Neon branch | `staging` (`br-cool-union-be6tvja6`) |
| Database | `neondb` |
| Runtime role | `exelta_app` |
| Cloudflare account | `6266f92b054b68ec69ff619d3869f195` |
| Cloudflare Hyperdrive | `exelta-staging` (`6b65f8e46ab34ec39b87abd9fdbf5636`) |
| Expected staging URL | `https://exelta-staging.rieza902.workers.dev` |
| Clerk application | `Exelta Staging` |
| Clerk development instance | `ins_3Lwa3CgyxejXJAVQVCljPvOgBHB` |

The Neon project and staging branch are isolated. The staging Hyperdrive origin is the staging Neon host/database and authenticates as `exelta_app`. Hyperdrive caching is disabled and the configured origin connection limit is 5. Migration operations remain separate and use the database owner. The migration ledger was not visible in the latest metadata inspection; verify migration state before applying any migration again.

The production Worker `zuna` and production Hyperdrive are not used by staging. No production database, DNS, credentials, or deployment was changed.

## Authentication implementation

The authentication architecture and request flow are documented in [AUTHENTICATION.md](./AUTHENTICATION.md).

- Clerk `proxy.ts` is used because the repository is on Next.js 16. It initializes Clerk middleware for application and API requests and protects `/app`.
- `ClerkProvider` is mounted by the root layout. Staging and production throw if the publishable key is absent; local development can still run without Clerk configured.
- API handlers resolve identity through Clerk `auth()` / `requireUser()`, then enforce workspace membership and role before database access.
- Clerk session tokens are not copied into the application database.
- The separate Clerk application already exists. Its development instance is configured for email/password and email-code authentication; Google sign-in is enabled in the instance configuration. Use its secret key only in the staging Worker secret store.
- The staging publishable key is a non-secret value in the staging Wrangler config. `CLERK_SECRET_KEY` is not committed.

## Cloudflare deployment

Cloudflare Workers Builds is disconnected from the GitHub repository in the currently connected account. The repository now includes a gated GitHub Actions deploy workflow as an alternate Cloudflare deployment path: `.github/workflows/deploy-staging.yml`. It deploys only the named implementation branch to Worker `exelta-staging`, installs the Clerk secret, and runs the fail-closed live acceptance suite. It cannot deploy the production Worker. Trigger it by pushing a commit whose message contains `[deploy-staging]` to the implementation branch, or use `workflow_dispatch` when available.

The workflow uses:

- Cloudflare account `6266f92b054b68ec69ff619d3869f195`
- Worker `exelta-staging`
- Isolated staging Hyperdrive `6b65f8e46ab34ec39b87abd9fdbf5636`
- Expected workers.dev URL `https://exelta-staging.rieza902.workers.dev`

Configure these secrets in the GitHub Actions environment named `staging` before dispatching the workflow:

| Secret | Purpose |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Wrangler deploy access for the staging Cloudflare account |
| `CLERK_SECRET_KEY` | Secret key from the Exelta Staging Clerk development instance |
| `STAGING_CLERK_TEST_COOKIE` | Session cookie for test user one |
| `STAGING_CLERK_OTHER_TEST_COOKIE` | Session cookie for a different test user |

The initial deploy can publish the Worker before the two test sessions exist; the workflow then fails at the live acceptance step rather than reporting a false green result. After deployment, create/sign in two distinct Clerk staging users, save their session cookies as the two GitHub environment secrets, and trigger the workflow again with another `[deploy-staging]` commit or `workflow_dispatch`. Never paste cookies or secret keys into chat, source files, or logs.

The workflow requires `CLOUDFLARE_API_TOKEN` and `CLERK_SECRET_KEY` before deploying. The first run is therefore blocked until those two secrets are configured. It runs typecheck, unit tests, lint, build, staging-config validation, deploy, Clerk secret installation, and then authenticated acceptance with `CI_REQUIRE_LIVE_ACCEPTANCE=1`.

## Optional integration secrets

The following are not required for Clerk sign-in or the Memory Fabric acceptance suite:

- GitHub integration: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_REDIRECT_URI`, and `GITHUB_TOKEN_ENCRYPTION_KEY`. The encryption key must be base64-encoded 32-byte material. Store the secret and client secret as Worker secrets; client ID and redirect URI are non-secret variables.
- Stripe billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and plan price IDs `STRIPE_PRICE_PRO`, `STRIPE_PRICE_BUSINESS`, `STRIPE_PRICE_EXECUTIVE`.

Do not configure production keys in the staging Worker. Staging database traffic uses Hyperdrive, not `DATABASE_URL`.

## Verification commands

From the repository root with Node 24:

```sh
npm run validate:staging
npm run typecheck
npm run test
npm run lint
APP_ENV=staging CLOUDFLARE_ENV=staging NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<staging-publishable-key> npm run build
CI_REQUIRE_LIVE_ACCEPTANCE=1 STAGING_BASE_URL=https://exelta-staging.rieza902.workers.dev STAGING_CLERK_TEST_COOKIE=<user-one-cookie> STAGING_CLERK_OTHER_TEST_COOKIE=<user-two-cookie> npm run test:acceptance
```

The live suite covers anonymous access rejection, two-user workspace and memory isolation, context switching, provenance-aware retrieval, conflict candidate review, user-confirmed contradiction quarantine, correction, archival, and cleanup. A skipped or unexecuted live test is not a pass.

## Release boundaries

- Build with `CLOUDFLARE_ENV=staging` before `wrangler deploy`; the Cloudflare Vite plugin resolves and flattens the selected environment at build time. Do not pass `--env` to the generated deployment config.
- Do not merge PR #33 or deploy production as part of staging verification.
- Do not change production Hyperdrive, production Clerk credentials, DNS, or production Worker.
- Conflict detection produces lexical candidates for explicit user review; it does not claim autonomous semantic contradiction resolution.
