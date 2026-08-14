# XIO

XIO is transitioning from a browser-only demo to a server-backed SaaS application.

## Current state

- `/` embeds the existing demo unchanged
- `/api/health` is a deployment health endpoint
- `/api/chat` validates input and intentionally returns `503` until authentication, data access, and AI Gateway are configured

## Production prerequisites

1. Create a Neon database through the Vercel Marketplace. Vercel Postgres is no longer first-party; existing databases migrated to Neon through the Marketplace in December 2024.
2. Connect an authentication provider and configure secure session handling.
3. Connect Stripe and add webhook signing secrets.
4. Configure Vercel AI Gateway credentials.
5. Apply a database migration from an environment that can reach the provider, then deploy.

Do not route personal data to an AI provider until authenticated ownership checks, consented memory selection, deletion/export workflows, and rate limits are enabled.

## Data model and privacy

`db/migrations/001_xio_core.sql` models users, preferences, memories, goals, conversations, messages, events, and subscription state. The application server must scope every query by the verified authenticated user ID. Never expose `DATABASE_URL`, Stripe secrets, or AI credentials to the browser.

The product must retain the demo's privacy controls: consent before memory creation, per-memory edit/delete, account export, account deletion, and a learning pause. The included account routes are deliberately fail-closed until an authentication provider and database are connected.

## Billing and AI configuration

Subscription changes must originate with Stripe Checkout and be applied only from verified Stripe webhook events. The checkout and webhook routes are intentionally fail-closed until Stripe credentials, price IDs, and webhook signing verification are installed. Similarly, AI requests must be executed server-side through Vercel AI Gateway only after authentication, entitlement checks, rate limits, and consented-memory retrieval are enabled.

## Authentication

Clerk is connected to this Vercel project. `/sign-up` and `/sign-in` provide hosted account creation and login; `/app` and sensitive API routes are protected by verified Clerk sessions. The existing browser demo remains isolated from personal cloud data until the Neon-backed data layer is implemented.

## Stripe subscriptions

Checkout is enabled for the configured Pro, Business, and Executive prices and requires a verified Clerk session. Before treating an account as paid, configure a Stripe webhook for `/api/billing/webhook`, set its signing secret as `STRIPE_WEBHOOK_SECRET`, and apply the Neon migration so verified subscription events can synchronize the `subscriptions` table. The portal route remains disabled until that lookup exists.
