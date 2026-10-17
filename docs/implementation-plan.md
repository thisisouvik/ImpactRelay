# ImpactRelay Implementation Plan

ImpactRelay is now in **Phase 2**: the first real case workflow is being built on top of the Phase 1 workspace.

Current stack:

- Next.js `16.4.2`
- React `19.3.0`
- TypeScript
- Tailwind CSS `4`
- npm with committed `package-lock.json`

Current gaps:

- Real external tool adapters are not connected yet.
- Real Grok/local model adapters are not connected yet.
- x402, Stellar Testnet payments, and hosted Vercel persistence are not connected yet.
- The current rules planner is intentionally transparent and is not represented as an LLM result.

## Judging integrity rule

The running application must not ship hardcoded case examples, fabricated evidence, synthetic payment receipts, or fake provider responses. All case content shown in the product must come from user input or a real adapter response. Deterministic test doubles are permitted only under `tests/` and must never be imported by the application runtime.

---

## Product definition of done

The MVP is complete when a reviewer can:

1. Open the ImpactRelay workspace.
2. Submit a flood-support case.
3. Review the agent's plan.
4. See free tools run first.
5. See a clear paid-tool checkpoint.
6. Approve or reject the payment.
7. Inspect the evidence and event history.
8. Review confidence, freshness, uncertainty, and sources.
9. View a verified Stellar Testnet receipt in integrated mode.
10. Export the case as JSON or Markdown.
11. See an explicit, safe blocked state when a real adapter is unavailable instead of seeing fabricated output.

---

## Phase 0 — Confirm the product and repository contract

**Status:** Documentation already exists.

### Objectives

Freeze the MVP scope before adding integrations.

### Scope

- One case at a time.
- Flood-support community-assistance scenario.
- Transparent rules planning during the initial build, followed by real Local and Grok adapters.
- Stellar Testnet only.
- One paid x402 specialist service.
- Human approval for the first real payment.
- Evidence, payment, and activity provenance.
- No mainnet, custody, emergency dispatch, or sensitive long-term storage.

### Exit criteria

- The demo flow is clear from the documentation.
- Every paid action has a budget, approval rule, and failure behavior.
- Missing external integrations fail visibly without fabricating evidence or payment results.

---

## Phase 1 — Toolchain foundation and real-data product shell

### Objectives

Replace the starter screen with the Signal Garden workspace and make the build reproducible.

### Implementation tasks

1. Pin Node.js 22:
   - Add `.nvmrc`.
   - Add the same version to `package.json` `engines`.
   - Use Node 22 in Docker and GitHub Actions.

2. Add scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "typecheck": "tsc --noEmit --incremental false",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "test:testnet": "vitest run tests/testnet"
  }
}
```

3. Replace `next/font/google` with a local/system font strategy.

4. Add testing infrastructure:
   - Vitest.
   - React Testing Library.
   - Playwright.
   - `vitest.config.ts`.
   - `playwright.config.ts`.

5. Build the product shell around real case lifecycle states:
   - Empty new-case form.
   - Stored case header.
   - Plan review.
   - Event history.
   - Evidence boundary with no placeholder sources.
   - Safe blocked state.
   - Responsive review layout.

6. Keep all sample input and expected outputs inside tests only. The production UI must start empty and require user input.

### Expected UI structure

```text
app/
  page.tsx
  layout.tsx
  globals.css

components/
  case/
  evidence/
  payments/
  report/
  ui/
```

### Checks

```bash
npm ci
npm run lint
npm run typecheck
npm run build
```

### Acceptance criteria

- The starter screen is removed.
- A first-time user understands the product within 30 seconds.
- A user can submit a real request and see it persisted.
- The plan and event history are based on the submitted request.
- Missing adapters are shown as a safe boundary, not as fake evidence.
- The build works without downloading fonts.
- Status is communicated with text and icons, not color alone.

---

## Phase 2 — Domain contracts and real case workflow

### Objectives

Create the core domain model and make the case lifecycle, planning, persistence, and safe failure behavior real before adding external tool calls.

### Implementation areas

```text
lib/
  agent/
    state-machine.ts
    planner.ts
  config/
    env.ts
  evidence/
    schemas.ts
    confidence.ts
  policy/
    budget.ts
    approvals.ts
  payments/
    types.ts
  db/
    repository.ts
    sqlite-repository.ts
```

### Add schemas for

- Case input.
- Case status.
- Agent plans.
- Agent steps.
- Evidence.
- Approvals.
- Payment attempts.
- Final reports.
- API errors.

### Agent lifecycle

```text
RECEIVED
→ PLANNING
→ PLAN_READY
→ RUNNING_FREE_TOOLS
→ PAYMENT_REQUIRED
→ RUNNING_PAID_TOOL
→ VALIDATING_EVIDENCE
→ REPORT_READY
→ COMPLETED
```

Additional states:

```text
PAUSED
BLOCKED
FAILED
```

### API routes

```text
POST /api/cases
GET  /api/cases/[id]

POST /api/agent/plan
POST /api/agent/run
POST /api/agent/approve
POST /api/agent/pause

GET  /api/payments/[id]
GET  /api/cases/[id]/export
GET  /api/health
```

### Real workflow requirements

The Phase 2 application path must:

- Start with a user-submitted request, not a scenario fixture.
- Persist the case, budget, plan, and event history in SQLite.
- Generate a transparent rules-based plan from the submitted request.
- Expose real API routes for create, read, plan, pause, run, health, and export.
- Stop safely when a tool adapter is unavailable.
- Never create synthetic evidence, payment receipts, or provider responses.
- Keep test doubles and test-only data under `tests/`.

### Required tests

- Invalid input is rejected.
- Unknown tools are rejected.
- Illegal state transitions are rejected.
- Rejected approvals cannot execute.
- Paused cases cannot continue without resumption.
- A request survives a browser refresh and process restart.
- A blocked execution records why no tool result was produced.
- API errors use a stable response shape.
- No route claims an external result without an adapter response.

### Acceptance criteria

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

A case must move from request to a persisted, reviewable plan entirely locally. Execution must stop safely until real tool adapters exist.

---

## Phase 3 — Free tools and evidence provenance

### Objectives

Add free data sources and ensure every recommendation can be traced to evidence.

### Initial tools

| Tool | Type | Purpose |
|---|---|---|
| `location.lookup` | Free | Resolve a human location through OpenStreetMap/Nominatim |
| `weather.current` | Free | Retrieve weather and rainfall context through Open-Meteo |
| `public.source.read` | Free | Read allow-listed public information |
| `text.localize` | Free or paid | Produce bilingual output |

### Adapter requirements

Every adapter should provide:

- Validated input.
- Timeout handling.
- Response-size limits.
- Malformed response handling.
- Source URL.
- Retrieval timestamp.
- Freshness.
- Confidence.
- Safe error mapping.

### Evidence UI

Add:

- Evidence cards.
- Source links.
- Freshness labels.
- Confidence labels.
- Conflicting evidence indicators.
- Evidence constellation/list.
- Evidence type labels:
  - Source fact.
  - Model synthesis.
  - Recommendation.
  - Human confirmed.

### Required tests

- Location success.
- Ambiguous location.
- Weather success.
- Stale weather.
- Public-source timeout.
- Oversized source response.
- Malformed tool response.
- Conflicting evidence.
- Evidence without a source is marked as model-generated.
- Free tools execute before paid tools are proposed.

### Acceptance criteria

- Unsupported claims are not presented as verified facts.
- Stale evidence is visible.
- Every source-backed item contains provenance.
- Free tools run before paid tools.

---

## Phase 4 — Grok, local, and mock provider adapters

### Objectives

Support multiple model providers without coupling the domain logic to one provider.

### Provider interface

```ts
interface LlmProvider {
  readonly id: "grok" | "local" | "mock";

  plan(input: PlannerInput): Promise<AgentPlan>;

  summarize(input: SynthesisInput): Promise<FinalReportDraft>;
}
```

### Provider selection

1. Explicit configured mode.
2. Grok when configured and healthy.
3. Local provider when configured and healthy.
4. Mock provider as the final fallback.

Record the selected provider in the case event history.

### Grok adapter

Implement:

- Server-only API calls.
- Structured output validation.
- Timeouts.
- Safe retries.
- Rate-limit handling.
- Invalid-output handling.
- Prompt-size limits.
- Redacted provider errors.

### Local provider

Implement a generic HTTP provider for a locally running model server.

A local model URL will not work from Vercel unless it is externally reachable. Vercel should use Mock or Grok mode by default.

### Required tests

- Valid structured output.
- Invalid JSON.
- Schema-invalid output.
- Empty output.
- Timeout.
- Rate limit.
- Provider fallback.
- Unknown model-selected tool.
- Fake source URL.
- Prompt-injection content from an external source.
- No secrets in client bundles or responses.

### Acceptance criteria

- No Grok key is required for local development.
- Malformed model output is rejected.
- The model cannot execute unregistered tools.
- Final reports distinguish facts from synthesis.

---

## Phase 5 — x402 seller and Stellar Testnet buyer

### Objectives

Implement the central payment flow:

```text
HTTP 402
→ policy check
→ human approval
→ payment signing
→ facilitator verification
→ settlement
→ paid request retry
→ receipt-backed evidence
```

### Seller service

Implement:

```text
services/risk-service/
  package.json
  src/
    server.ts
    risk-tool.ts
    schemas.ts
```

The service must:

- Return `402 Payment Required`.
- Include network, asset, amount, recipient, expiry, and payment intent.
- Validate the payment.
- Return protected content only after successful verification.
- Validate its own response against a schema.

### Buyer/payment modules

```text
lib/payments/
  x402-client.ts
  stellar-client.ts
  payment-policy.ts
  payment-receipts.ts
  idempotency.ts
```

### Policy limits

```text
maxAmountPerPayment = $0.02
maxAmountPerCase = $0.05
maxPaidStepsPerCase = 3
```

The policy must enforce:

```text
network == stellar:testnet
asset is allow-listed
tool is allow-listed
amount <= per-payment cap
case total <= case cap
quote is not expired
approval exists when required
payment intent is not already settled
```

Amounts must use decimal-safe strings or atomic units.

### Payment UI

Display:

- Payment reason.
- Amount.
- Asset.
- Network.
- Budget remaining.
- Quote expiry.
- Approve.
- Reject.
- Policy explanation.
- Settlement status.
- Transaction ID.
- Explorer link after verified settlement.

### Required tests

- 402 response.
- Valid quote.
- Unsupported network.
- Unsupported asset.
- Unknown paid tool.
- Amount above cap.
- Case budget exceeded.
- Expired quote.
- Approval required.
- Approval rejected.
- Payment payload creation.
- Facilitator verification failure.
- Settlement failure.
- Successful settlement.
- Duplicate payment intent.
- Retry after settlement.
- Paid content remains locked until settlement verification.
- Failed payment does not create paid evidence.

### Live Testnet smoke test

This must be opt-in:

```bash
npm run test:testnet
```

It requires:

- Disposable Testnet wallet.
- Testnet funding.
- Configured facilitator.
- Known paid service.
- Protected environment or explicit local invocation.

### Acceptance criteria

- The local paid service returns a real HTTP 402.
- Over-budget payments are blocked server-side.
- Rejected payments do not execute.
- Approved payments produce a verified Testnet receipt.
- A payment header alone never counts as settlement.

---

## Phase 6 — Persistence and resumability

### Objectives

Make case state survive refreshes, restarts, and serverless requests.

### Repository interface

```ts
interface CaseRepository {
  createCase(input: CreateCaseInput): Promise<Case>;
  getCase(id: string): Promise<Case | null>;
  savePlan(id: string, plan: AgentPlan): Promise<void>;
  appendEvent(event: CaseEvent): Promise<void>;
  saveEvidence(item: EvidenceItem): Promise<void>;
  saveApproval(approval: Approval): Promise<void>;
  savePayment(payment: PaymentAttempt): Promise<void>;
}
```

### Storage strategy

#### Local development

Use SQLite:

```text
data/impactrelay.sqlite
```

#### Vercel

Use a hosted PostgreSQL-compatible database connected to Vercel, such as a Neon/Vercel database integration.

Recommended adapters:

```text
Local development:
  SQLiteRepository

Vercel:
  HostedPostgresRepository

Tests:
  MemoryRepository
  SQLiteRepository
  Hosted repository contract tests
```

This should be documented in a new ADR because local SQLite cannot be treated as durable Vercel storage.

### Tables

- `cases`
- `agent_steps`
- `case_events`
- `evidence_items`
- `approvals`
- `payment_attempts`

### Required tests

- Memory and SQLite repository contract parity.
- Create/read case.
- Plan persistence.
- Event persistence.
- Evidence persistence.
- Approval persistence.
- Payment receipt persistence.
- Resume after restart.
- No duplicate settlement after restart.
- JSON export.
- Markdown export.
- No raw payment signatures persisted.
- No secrets persisted.

### Acceptance criteria

- Refreshing the browser preserves the case.
- Restarting the local app preserves history.
- Vercel requests do not rely on process-local memory.
- Resuming a case never replays a settled payment.

---

## Phase 7 — Production hardening and security

### Implementation tasks

- Add `.env.example`.
- Validate environment variables server-side.
- Enforce server-only imports for provider, database, and payment code.
- Add request size limits.
- Add rate-limiting strategy.
- Add redacted structured logging.
- Add `/api/health`.
- Add loading, error, blocked, paused, and degraded states.
- Add privacy warning against entering real sensitive data.
- Add persistent `Stellar Testnet` labels.
- Add accessible transaction ID copy controls.
- Add keyboard navigation.
- Add visible focus styles.
- Add `aria-live` updates.
- Respect reduced-motion settings.

### Security checks

- Search production bundles for API keys and private-key patterns.
- Ensure no client component imports payment or provider modules.
- Validate external URLs against an allow-list.
- Treat fetched content as untrusted data.
- Prevent external content from changing policy or payment instructions.
- Add dependency scanning and secret scanning.

### Acceptance criteria

- Missing credentials fail safely.
- Unknown networks fail closed.
- Invalid quotes fail closed.
- Unverified settlements do not unlock paid content.
- No secrets appear in browser bundles or logs.
- Mock mode still works completely.

---

## Phase 8 — Vercel deployment

### Recommended topology

```text
Vercel Project 1:
  impactrelay-web

Vercel Project 2:
  impactrelay-risk-service

Managed database:
  Hosted PostgreSQL-compatible database

External services:
  xAI API, optional
  Stellar Testnet RPC
  x402 facilitator
```

The risk service can be deployed separately or replaced with a compatible hosted x402 seller. The local service must remain available for offline and integration testing.

### Preview environment

Use:

```text
APP_MODE=mock
STELLAR_NETWORK=stellar:testnet
```

Do not expose production payment secrets to preview deployments.

Preview must verify:

- UI.
- Mock orchestration.
- API routes.
- Database connectivity.
- Export.
- Health endpoint.

### Production default

Start with:

```text
APP_MODE=mock
```

This keeps the hosted application usable if Grok, Stellar, the facilitator, or the paid service is unavailable.

### Integrated production environment

Configure only after the Testnet smoke test passes:

```text
APP_MODE=grok
XAI_API_KEY=...
XAI_MODEL=...

STELLAR_NETWORK=stellar:testnet
STELLAR_RPC_URL=...
STELLAR_PRIVATE_KEY=...
STELLAR_PAY_TO_ADDRESS=...
X402_FACILITATOR_URL=...
RISK_SERVICE_URL=...

DATABASE_URL=...
LOG_LEVEL=info
```

Never expose these through `NEXT_PUBLIC_` variables.

### Vercel deployment sequence

1. Create the `impactrelay-web` Vercel project.
2. Configure Next.js and Node.js 22.
3. Connect the hosted database.
4. Configure Preview and Production variables separately.
5. Run database migrations using a protected release process.
6. Deploy a Mock-mode preview.
7. Verify:
   - `/`
   - `/api/health`
   - Case creation.
   - Plan generation.
   - Mock execution.
   - Export.
8. Deploy to Production.
9. Configure a custom domain if required.
10. Run the Mock-mode browser rehearsal.
11. Configure Testnet credentials only after validation.
12. Execute one small Testnet payment.
13. Verify the transaction on the configured explorer.
14. Keep the Mock-mode demo as the fallback presentation path.

### Vercel runtime requirements

- Use the Node.js runtime for database, AI, and payment routes.
- Avoid long-lived in-process jobs.
- Use short idempotent requests and polling.
- Disable caching for case and payment state.
- Do not rely on local filesystem persistence.
- Make all payment and agent operations resumable.

---

## GitHub Actions CI/CD

Create:

```text
.github/
  workflows/
    ci.yml
    deploy-production.yml
    testnet-smoke.yml
```

### `ci.yml`

#### Triggers

- Pull requests.
- Pushes to `main`.
- Manual dispatch.

#### Required jobs

##### Quality

```bash
npm ci
npm run lint
npm run typecheck
npm test
```

##### Build

```bash
npm run build
```

##### Browser tests

```bash
npm run test:e2e
```

The browser suite must use Mock mode and must not require:

- Grok credentials.
- Stellar credentials.
- A facilitator.
- A live paid service.
- Live weather or location APIs.

##### Security

Run:

```bash
npm audit --audit-level=high
```

Also add:

- Secret scanning.
- Dependency review on pull requests.
- CodeQL for TypeScript and JavaScript.

#### CI behavior

- Use Node 22.
- Use `npm ci`.
- Cache npm dependencies.
- Upload Playwright reports on failure.
- Upload build diagnostics on failure.
- Cancel outdated runs for the same branch.
- Keep all default tests offline.
- Pin GitHub Actions versions or commit SHAs.

### `deploy-production.yml`

#### Trigger

Run after `ci.yml` completes successfully on `main` using `workflow_run`.

#### Deployment steps

1. Checkout the exact commit tested by CI.
2. Set up Node 22.
3. Run `npm ci`.
4. Load the protected Vercel production environment.
5. Run database migrations.
6. Build through the Vercel CLI.
7. Deploy the prebuilt application.
8. Deploy the risk service if it is a separate Vercel project.
9. Run a post-deployment health check.
10. Publish the deployment URL and commit SHA.
11. Fail if `/api/health` is unhealthy.

Required GitHub secrets:

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

Use a protected `production` environment with:

- Required reviewers.
- Main-branch restrictions.
- Environment-specific secrets.
- No Testnet private key in pull request jobs.

### `testnet-smoke.yml`

#### Trigger

Manual `workflow_dispatch` only.

#### Protection

Use a protected `testnet` GitHub environment with approval required.

#### Test sequence

1. Confirm `STELLAR_NETWORK=stellar:testnet`.
2. Confirm the asset is allow-listed.
3. Confirm the wallet is disposable.
4. Execute a tiny payment.
5. Wait for facilitator verification.
6. Verify settlement on Testnet.
7. Verify the paid response.
8. Record the transaction ID as workflow output.
9. Never print private keys, signatures, or authorization headers.

### Preview deployments

Use Vercel's native Git integration for pull request previews. This avoids exposing Vercel credentials to untrusted forked pull requests.

All preview deployments should use Mock mode.

---

## Required test matrix

### Unit tests

- Case validation.
- Plan validation.
- State transitions.
- Budget caps.
- Decimal and atomic amount comparison.
- Approval requirements.
- Evidence freshness.
- Confidence classification.
- Conflict detection.
- Tool allow-listing.
- Redaction.
- Explorer URL construction.
- Environment validation.
- Export generation.

### Provider contract tests

Run the same contract tests against:

- Mock provider.
- Local provider with a stub HTTP server.
- Grok provider with stubbed responses.

Cover:

- Valid output.
- Invalid JSON.
- Schema-invalid output.
- Empty output.
- Timeout.
- Rate limit.
- Provider fallback.
- Provider failure event logging.

### Tool adapter tests

- Successful location lookup.
- Ambiguous location.
- Weather response.
- Stale weather.
- Source timeout.
- Oversized response.
- Malformed response.
- Source URL preservation.
- Retrieval timestamp preservation.
- Prompt-injection content treated as untrusted data.

### Payment tests

- HTTP 402 response.
- Network validation.
- Asset validation.
- Recipient validation.
- Amount validation.
- Quote expiry.
- Human approval.
- Rejection.
- Payment payload creation.
- Facilitator verification failure.
- Settlement failure.
- Successful settlement.
- Duplicate payment intent.
- Already-settled payment.
- Case budget exceeded.
- Paid result withheld until settlement verification.

### API integration tests

Test:

```text
POST /api/cases
GET  /api/cases/[id]
POST /api/agent/plan
POST /api/agent/run
POST /api/agent/approve
POST /api/agent/pause
GET  /api/payments/[id]
GET  /api/cases/[id]/export
GET  /api/health
```

Verify:

- Correct status codes.
- Stable error responses.
- Validation failures.
- Approval boundaries.
- Redacted responses.
- Unknown case behavior.
- Duplicate request behavior.
- No secrets in serialized responses.

---

### Browser acceptance tests

The default browser suite should run in Mock mode and cover:

1. Open the new-case screen.
2. Select the flood-support example.
3. Create a case.
4. Review the plan.
5. Run free checks.
6. See the payment checkpoint.
7. Reject the payment.
8. Confirm the paid step does not execute.
9. Reload the case.
10. Approve a mock payment flow.
11. See the mock receipt labeled as mock.
12. Inspect evidence.
13. Read the final report.
14. Export JSON.
15. Export Markdown.
16. Use a narrow viewport.
17. Navigate with the keyboard.
18. Verify focus states.
19. Enable reduced motion.
20. Verify no horizontal scrolling.
21. Verify accessible labels.

### Testnet smoke tests

These are separate from `npm test` and must remain opt-in.

Verify:

- Correct Testnet network.
- Disposable wallet.
- Tiny payment amount.
- Facilitator verification.
- Settlement confirmation.
- Paid content only after settlement.
- Transaction ID in the report.
- Explorer link.
- Visible degraded behavior during failure.

---

## Branch protection and release gates

Protect `main` with these required checks:

```text
lint
typecheck
unit-and-integration-tests
build
browser-e2e
security
```

Recommended rules:

- No direct pushes to `main`.
- Pull request required.
- At least one approval.
- Successful CI required before merge.
- Production deployment only from `main`.
- Testnet workflow requires manual approval.
- Dependabot updates go through normal CI.

---

## Final command contract

A clean checkout must support:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Optional commands:

```bash
npm run dev
npm run start
npm run test:testnet
docker build -t impactrelay .
docker compose up
```

`npm test` must remain deterministic, offline, and free of Testnet spending.

The most important sequencing rule is to finish the Mock-mode vertical slice before adding Grok, x402, Stellar, or hosted persistence. This creates a dependable demo first and allows every external integration to be validated against an already-working product flow.
