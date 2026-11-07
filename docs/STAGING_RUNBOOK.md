# Exelta Staging Runbook

This document records the verified staging architecture and the remaining account-owner actions. Do not use production credentials or production resources to satisfy a staging check.

## Verified infrastructure

| Resource | Value |
|---|---|
| GitHub repository | `aries306/Xioeffect` |
| Implementation PR | [#33](https://github.com/aries306/Xioeffect/pull/33) |
| Staging Neon project | `exelta-staging` |
| Neon project ID | `fragrant-block-35529572` |
| Neon branch | `staging` (`br-cool-union-be6tvja6`) |
| Database | `neondb` |
| Runtime role | `exelta_app` |
| Cloudflare Hyperdrive | `exelta-staging` (`430591688b914fe3b293876ff7736704`) |
| Cloudflare build Worker tag | `e3febc159aa1413e9df0273bd1441554` |
| Cloudflare build trigger | `9c6bfd01-3f25-4af0-ae62-43d520bb7fff` |

Migrations `001`–`007` are applied to the isolated staging database. The database currently has 19 application tables.

The Hyperdrive origin is the staging Neon host/database and authenticates as `exelta_app`. Hyperdrive caching is disabled. Runtime grants allow schema usage and table SELECT/INSERT/UPDATE/DELETE; schema CREATE, table TRUNCATE, REFERENCES, and TRIGGER are denied. A direct role-authenticated CRUD smoke test passed and its temporary rows were removed. The staging schema currently has no public sequences, so no sequence grants are required. Migration operations remain separate and use the database owner.

The production Worker `zuna` and its Hyperdrive binding are not used by staging. No production database, DNS, credentials, or deployment was changed.

## Cloudflare Worker configuration

The repository's `wrangler.jsonc` defines `env.staging`:

- Worker name: `exelta-staging`
- `APP_ENV=staging`
- `HYPERDRIVE` points to the staging Hyperdrive ID above
- Workers AI binding: `AI`

The existing Cloudflare Worker script named `exelta-staging` is currently only a dashboard-created placeholder: it has no application bindings, no Clerk secrets, and its `workers.dev` subdomain is disabled. It is not an operational deployment and must not be presented as one.

The Workers Builds trigger is CI-only. Its build command is:

```sh
npm run validate:staging && npm run typecheck && npm run test && npm run lint && npm run build && npm run test:acceptance
```

Its deploy command intentionally remains a no-op until Clerk staging authentication and the authenticated acceptance flow are ready. `CI_REQUIRE_LIVE_ACCEPTANCE=1` remains enabled.

## Clerk staging application

No Clerk management integration or authorized Clerk dashboard session was available during this pass. Create a separate Clerk application named **Exelta Staging**; do not reuse production keys.

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

After the application is deployed, enable its `workers.dev` subdomain and use that exact HTTPS origin as `STAGING_BASE_URL`. Do not enable public preview while the Clerk keys and Hyperdrive binding are absent.

## Authenticated acceptance credentials

The acceptance test requires **two independent Clerk test users**, not one shared session.

Configure these values separately in GitHub Actions repository/environment settings and in the Cloudflare Workers Builds trigger environment variables:

| Name | Storage | Purpose |
|---|---|---|
| `STAGING_BASE_URL` | Plain variable | Exact HTTPS staging origin |
| `STAGING_CLERK_TEST_COOKIE` | Secret | Session cookie for the first test user |
| `STAGING_CLERK_OTHER_TEST_COOKIE` | Secret | Session cookie for a second, different test user |
| `CI_REQUIRE_LIVE_ACCEPTANCE` | Plain variable, value `1` | Fail closed if live acceptance is missing |

The second cookie is required by the cross-user isolation assertions. Session cookies are credentials: do not paste them into chat, commit them, or print them in CI logs. Rotate them when expired or exposed.

GitHub Actions reads `STAGING_BASE_URL` from repository/environment variables and the two cookies from Actions secrets. Cloudflare Workers Builds has its own independent trigger variables; configuring one system does not configure the other.

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

## Deployment sequence after Clerk setup

1. Add staging Clerk keys to the staging Worker only.
2. Set the staging URL and two test-session cookies in both CI systems.
3. Deploy the branch to the staging environment with `npx wrangler deploy --env staging`; do not use the production deploy command.
4. Enable the staging Worker `workers.dev` URL and record the exact origin.
5. Run the full validation command sequence above.
6. Verify health, sign-in, persistent database access, and the complete authenticated acceptance test in a real browser/session.
7. Only after all checks pass should PR #33 be considered ready for review. Merging, production deployment, DNS changes, and production migrations require separate explicit authorization.

## Current known limitations

- Clerk staging application and keys are not configured.
- The placeholder Cloudflare Worker is not yet a deployed application and has no bindings/secrets.
- The live authenticated acceptance test has not passed.
- GitHub Actions runs have failed before job steps execute (runner allocation failure). Cloudflare Workers Builds is available as an executable CI path and is configured to run the full deterministic checks before the fail-closed live acceptance test.
- Contradiction candidate detection is lexical and explicitly requires user review. This implementation does not claim autonomous semantic contradiction resolution.
- No production change or PR merge has been performed.
