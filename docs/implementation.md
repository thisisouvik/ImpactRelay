# Implementation plan

> Integrity update: production runtime code must not use hardcoded demo cases, fabricated evidence, synthetic receipts, or fake provider results. Test doubles and fixtures belong under `tests/` only.

## Implementation rule

Build one complete, demoable vertical slice at a time. Do not add a provider, wallet, database, or UI abstraction until the user-visible flow it supports is clear. Every phase ends with a real check and a short update to the relevant documentation.

## Phase 0 — documentation and repository shape

**Status: current phase.**

Deliverables:

- Product idea and MVP boundary.
- Signal Garden design direction.
- Technical architecture and folder ownership.
- Security and testing rules.
- Deployment plan.
- Empty folders with tracked placeholders.
- ADRs for provider fallback and payment boundaries.

Exit criteria:

- A new contributor can explain the demo flow from the docs.
- The documents do not claim unimplemented integrations are working.
- The planned structure separates UI, domain logic, providers, payments, and tests.

## Phase 1 — real-data product shell

Deliverables:

- Replace the Next.js starter screen with the ImpactRelay workspace.
- Remove the starter build's network-dependent Google Font fetch, using a local or system-font strategy that works on a clean/offline build.
- Build the case rail, case header, evidence stream, trust rail, and report placeholder.
- Add responsive layout and semantic status components.
- Start with an empty new-case form and user-submitted content; keep fixture data in tests only.
- Add real lifecycle states: empty, stored, plan-ready, blocked, paused, and failed.

Checks:

- `npm run lint`
- Typecheck command added and passing.
- Manual desktop/tablet/mobile review.

Acceptance criteria:

- A visitor understands the product in under 30 seconds.
- Missing payments/tools are shown as explicit unavailable boundaries rather than fixture results.
- The final report can be read without opening a drawer.

## Phase 2 — domain contracts and real local workflow

Deliverables:

- Add Zod schemas for case input, plan, step, evidence, approval, and receipt.
- Add the `LlmProvider` interface.
- Add a transparent rules planner that uses the stored request and does not claim an LLM response.
- Add the bounded state machine.
- Add SQLite persistence for cases, plans, and events.
- Add route handlers for create, plan, run, approve, pause, and read.
- Stream or poll case events through a simple stable API.

Checks:

- Unit tests for schema rejection.
- Unit tests for illegal state transitions.
- Route-handler tests with no network access.
- `npm run lint`, typecheck, and the single test command.

Acceptance criteria:

- A case can move from request to a persisted plan entirely locally.
- A case survives a browser refresh and process restart.
- Missing tools stop execution safely without creating evidence.
- No runtime output is presented as a real provider, source, or settlement result unless an adapter returned it.

## Phase 3 — free tools and evidence

Deliverables:

- Add location lookup adapter.
- Add weather adapter.
- Add allow-listed public-source adapter.
- Normalize all outputs into evidence items.
- Add freshness and confidence calculation.
- Add evidence constellation/list view.
- Add source and retrieval metadata to the final report.

Checks:

- Adapter tests with recorded fixtures.
- Timeout and malformed-response tests.
- Offline mode tests using fixture responses.
- Manual review of source attribution.

Acceptance criteria:

- Free tools run before any paid tool is proposed.
- Each evidence item has a source or is explicitly marked as model synthesis.
- Stale and conflicting evidence are visible.

## Phase 4 — Grok and local provider adapters

Deliverables:

- Add server-only Grok adapter against the xAI API.
- Use structured output validation rather than trusting free-form JSON.
- Add timeout, retry, and provider error mapping.
- Add local provider adapter against a locally running open-source model server.
- Add provider selection configuration.
- Record which provider produced each plan/report.

Checks:

- Mock tests for Grok success, invalid output, timeout, and rate limit.
- Local provider contract tests.
- Live Grok smoke test only when `XAI_API_KEY` is explicitly provided.
- Secret-scan review to confirm keys never reach the browser bundle.

Acceptance criteria:

- The project remains usable with no Grok key.
- A malformed model response is rejected and surfaced as a recoverable error.
- The model cannot select a tool that is not present in the registry.

## Phase 5 — x402 seller and Stellar Testnet buyer

Deliverables:

- Add a small local `risk-service` with a paid endpoint.
- Add x402 seller middleware and a testnet configuration.
- Add server-side Stellar x402 buyer adapter.
- Add payment quote, approval, sign, settle, and retry states.
- Add spend policy and idempotency keys.
- Store transaction ID and facilitator status in the receipt.
- Add Stellar explorer link generation only after the network/asset format is confirmed.

Checks:

- Fake-facilitator integration tests for 402, approval, settlement, rejection, duplicate, and timeout.
- Real Stellar Testnet smoke test with a dedicated disposable wallet.
- Verify the resulting transaction on the configured network before calling it settled.
- Test the behavior after a testnet reset or facilitator outage.

Acceptance criteria:

- The agent receives an actual HTTP `402` from the local seller.
- Policy blocks an over-budget or unallow-listed payment.
- Approved payment produces a real testnet receipt in the UI.
- A failed payment never unlocks paid content.

## Phase 6 — persistence and resumability

Deliverables:

- Add SQLite repository implementation.
- Add schema/migration mechanism.
- Persist events, evidence, approvals, and payment attempts.
- Resume a paused case without replaying settled payment intents.
- Add Markdown and JSON export.

Checks:

- Repository contract tests run against memory and SQLite implementations.
- Restart/resume integration test.
- Duplicate-run and idempotency tests.
- Export snapshot test.

Acceptance criteria:

- A browser refresh does not erase the case.
- Case history remains inspectable after a process restart.
- Secrets and raw payment signatures are not persisted.

## Phase 7 — demo hardening and deployment

Deliverables:

- Add `.nvmrc`, `.env.example`, Dockerfile, and Docker Compose configuration.
- Add one reproducible `npm test` command that works offline.
- Add health route and dependency status display.
- Add loading, error, and degraded-mode UI.
- Write the final README runbook.
- Record a clean-machine rehearsal.

Checks:

- `npm ci`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- Docker build and local run.
- Demo rehearsal from a fresh checkout.

Acceptance criteria:

- Mock mode works with no external credentials.
- Real testnet mode can be enabled by environment variables only.
- The deployment never contains secrets in the image or client bundle.

## Suggested first coding slice

The first implementation should be deliberately narrow:

1. Build the static Signal Garden shell.
2. Add one mock case fixture.
3. Add one mock plan with free and paid steps.
4. Add the approval checkpoint.
5. Add the final report and evidence constellation.

Only after that visual flow is credible should provider and payment dependencies be installed.

## Definition of done for every change

- The behavior is documented or the relevant doc is updated.
- The smallest meaningful check has run.
- No secret, real private data, or real private key was added.
- Errors are visible and actionable.
- The change has a clear rollback or failure behavior.
- Unrelated boilerplate is not refactored without a reason.
