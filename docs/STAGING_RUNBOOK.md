# Exelta Staging Runbook

This document records the staging architecture and the remaining release gates. Do not use production credentials or production resources to satisfy a staging check.

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

The Neon project and staging branch are accessible and report ready. The database has 19 application tables. PR #33 records migrations `001`–`007` as applied. The currently exposed public schema did not return a migration-ledger table during a separate metadata check, so migration status should be confirmed against the migration process before another migration is applied.

The Hyperdrive origin is the staging Neon host/database and authenticates as `exelta_app`. Hyperdrive caching is disabled and its configured origin connection limit is 5. PR #33 records successful least-privilege role checks and a direct CRUD smoke test. Migration operations remain separate and use the database owner.

The production Worker `zuna` and production Hyperdrive are not used by staging. No production database, DNS, credentials, or deployment was changed.

## Cloudflare Worker configuration and deployment

The repository's `wrangler.jsonc` defines `env.staging`:

- Worker name: `exelta-staging`
- `APP_ENV=staging`
- `HYPERDRIVE` points to `6b65f8e46ab34ec39b87abd9fdbf5636`
- Workers AI binding: `AI`

The current Cloudflare connection can access the account and the staging Hyperdrive. Its Worker-script listing does **not** contain an `exelta-staging` application Worker; it contains only an unrelated script named `black-voice-a0d2`. Do not treat an old dashboard-created placeholder in another account as the current staging deployment.

Cloudflare Workers Builds is not currently connected to the GitHub repository. The repository-connection API returned an error stating that the project is disconnected from the Git account. No current build trigger or deploy pipeline was verified in this account. Do not claim that Cloudflare Workers Builds is executing CI until the GitHub integration is restored and a build is observed.

A direct Worker upload is also not a substitute for the application build: the actual Vinext application bundle and static assets must be built from this branch before deployment. Do not upload a placeholder Worker or publish a preview URL.

## Clerk staging application

No Clerk management plugin or authorized Clerk dashboard session is currently available. Create a separate Clerk application named **Exelta Staging**; do not reuse production keys.

Configure the Clerk application for the staging Worker origin and the application's routes:

- Sign-in URL: `/sign-in`
- Sign-up URL: `/sign-up`
- Post-authentication destination: `/app`
- Add the staging origin to the Clerk allowed origins/redirect allowlist.

Configure the staging Worker only:

| Binding | Type | Notes |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Plain variable | Staging publishable key |
| `CLERK_SECRET_KEY` | Secret | Staging secret key; never commit or log |
| `APP_ENV` | Plain variable | Must be `staging`; Wrangler config already sets it |

After the application is deployed, enable its `workers.dev` subdomain and use that exact HTTPS origin as `STAGING_BASE_URL`. Do not publish a public preview before the Clerk keys and staging Hyperdrive binding are configured.

## Authenticated acceptance credentials

The acceptance test requires **two independent Clerk test users**, not one shared session.

Configure these values as GitHub Actions variables/secrets:

| Name | Storage | Purpose |
|---|---|---|
| `STAGING_BASE_URL` | Plain variable | Exact HTTPS staging origin |
| `STAGING_CLERK_TEST_COOKIE` | Secret | Session cookie for the first test user |
| `STAGING_CLERK_OTHER_TEST_COOKIE` | Secret | Session cookie for a second, different test user |
| `CI_REQUIRE_LIVE_ACCEPTANCE` | Plain variable, value `1` | Fail closed if live acceptance is missing |

The second cookie is required by the cross-user isolation assertions. Session cookies are credentials: do not paste them into chat, commit them, or print them in CI logs. Rotate them when expired or exposed.

If a Cloudflare Workers Builds trigger is restored, configure its environment separately; GitHub Actions settings do not automatically populate Cloudflare build variables.

## Verification commands

From the repository root, with Node 24 and dependencies installed:

```sh
npm run validate:staging
npm run typecheck
npm run test
npm run lint
npm run build
CI_REQUIRE_LIVE_ACCEPTANCE=1 npm run test:acceptance
```

The live test covers anonymous access rejection, two-user workspace and memory isolation, context switching, provenance-aware retrieval, conflict candidate review, explicit user-confirmed contradiction quarantine, correction, archival, and cleanup of test memories.

The live test must run against the deployed staging URL with both independent session cookies. A skipped test is not a pass. Do not remove the fail-closed gate to obtain a green build.

## Deployment sequence after access and Clerk setup

1. Restore the GitHub-to-Cloudflare repository connection or establish another executable build path that can build this repository's actual application bundle.
2. Create the separate Clerk staging application and configure staging-only keys.
3. Configure `STAGING_BASE_URL` and the two independent session cookies in GitHub Actions.
4. Build the branch and deploy with `npx wrangler deploy --env staging`; do not use the production deploy command.
5. Enable the staging Worker `workers.dev` URL and record the exact origin.
6. Verify Hyperdrive from the deployed Worker, Clerk sign-in, session persistence, and the complete authenticated acceptance workflow.
7. Re-run all checks and require authenticated acceptance to pass with no skips before considering PR #33 ready for review. Merging, production deployment, DNS changes, and production migrations require separate explicit authorization.

## Current known limitations

- The isolated Neon staging project, branch, and Hyperdrive are present.
- The actual `exelta-staging` application Worker is not deployed in the currently connected Cloudflare account.
- Cloudflare Workers Builds reports that the GitHub repository is disconnected; no active build trigger was verified in the current account.
- Clerk staging application and keys are not configured.
- Two independent authenticated test sessions are not configured.
- GitHub Actions job retries have failed before runner allocation (`steps: null`); no tests ran in those retries.
- The live authenticated acceptance test has not passed.
- Contradiction candidate detection is lexical and explicitly requires user review. This implementation does not claim autonomous semantic contradiction resolution.
- No production change or PR merge has been performed.
