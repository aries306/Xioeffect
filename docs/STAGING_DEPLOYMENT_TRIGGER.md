# Staging deployment trigger

This file records the initial authorized staging deployment trigger. The deploy workflow is restricted to this branch and the isolated `exelta-staging` Cloudflare Worker. It requires the protected GitHub Actions `staging` environment secrets and runs authenticated acceptance tests before it can report success.
