# ADR 0003: Separate product UI, domain libraries, and local paid services

- **Status:** Accepted for MVP
- **Date:** 2026-10-17

## Context

The repository starts as a minimal Next.js application. The product needs browser UI, server-only orchestration, external adapters, tests, and a local x402 seller without turning the app into a collection of route-handler scripts.

## Decision

Keep the Next.js App Router at the root and use these boundaries:

- `app/` for routes and page composition.
- `components/` for UI.
- `lib/` for domain, provider, payment, and repository logic.
- `services/` for local paid-tool examples.
- `tests/` for offline and integration checks.
- `docs/` for product and engineering decisions.

Empty planned folders are tracked with `.gitkeep` until code is added.

## Consequences

- The existing boilerplate remains easy to run.
- Server-only code has a clear home.
- The paid service can be tested independently from the dashboard.
- The repository has more folders before code exists, but the structure communicates ownership and reduces later rewrites.
