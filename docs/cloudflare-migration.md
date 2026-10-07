# XIO → Cloudflare migration

## Target runtime

- Cloudflare Workers
- Vinext/Next app-router compatibility layer
- Cloudflare Vite plugin
- Hyperdrive for the existing PostgreSQL database
- Existing Clerk authentication
- Existing server-side AI and GitHub integrations

The migration keeps PostgreSQL data in place. No Memory Fabric data should be copied or rewritten as part of the hosting move.

## Hyperdrive

Create Hyperdrive from a trusted environment:

```bash
npx wrangler hyperdrive create xiohq-db --connection-string="$DATABASE_URL"
```

Then add the returned ID to `wrangler.jsonc`:

```jsonc
"hyperdrive": [
  {
    "binding": "HYPERDRIVE",
    "id": "<HYPERDRIVE_ID>"
  }
]
```

Never commit database, Clerk, GitHub OAuth, encryption, Stripe, or AI credentials.

## Verification

```bash
npm install
npm run test
npm run typecheck
npm run lint
npm run build:vinext
npm run preview:cloudflare
```

Verify health, Clerk user isolation, contextual Memory retrieval, every Memory Fabric lifecycle state, provenance separation from Research, and all existing authorization boundaries.

## Deployment

```bash
npm run build:vinext
npx wrangler deploy
```

The GitHub workflow on this branch performs the normal test, typecheck, lint, and build gates before deployment.

## Cutover

Keep Floot live during validation. Deploy Cloudflare in parallel, validate against the existing database, then switch the production domain. Do not remove the old deployment until the Cloudflare deployment has passed the live verification.

## Remaining infrastructure step

The source is now Cloudflare-oriented. The remaining infrastructure-only work is creating the production Hyperdrive configuration and adding Cloudflare deployment credentials to GitHub Actions. Those values belong in Cloudflare/GitHub secrets, not source control.
