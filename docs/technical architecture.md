# Technical architecture

## Status

This is the target architecture for the first implementation. The repository is still a Next.js boilerplate; these boundaries are design contracts, not claims that the integrations already exist.

## Goals

- Keep all secrets, LLM calls, payment signing, and policy checks on the server.
- Keep the browser experience fast, inspectable, and resilient to provider failures.
- Make hosted model providers optional by supporting Groq, Local, and deterministic providers.
- Make paid tool calls explicit, bounded, idempotent, and traceable.
- Keep the first deployment free or locally reproducible.
- Avoid coupling the domain model to a single LLM, chain, database, or hosting provider.

## Non-goals

- Building a general agent framework.
- Custodial wallet infrastructure.
- Mainnet settlement.
- Training or fine-tuning a model.
- Storing sensitive real-world case data by default.
- Running unbounded background jobs.

## System context

```text
                         ┌───────────────────────┐
                         │ Human volunteer       │
                         └───────────┬───────────┘
                                     │ browser
                                     ▼
┌──────────────────────────────────────────────────────────┐
│ Next.js ImpactRelay application                           │
│                                                          │
│ UI → Route handlers → Case orchestrator → Policy engine  │
│                         │                │               │
│                         ▼                ▼               │
│                    Tool registry     Receipt store       │
└──────────┬────────────────────┬──────────────┬──────────┘
           │                    │              │
           ▼                    ▼              ▼
        Groq API           Open data       x402 service
        (optional)        tools             + Stellar
```

## Runtime boundaries

### Browser boundary

The browser may:

- Submit a case request.
- Display a plan and event stream.
- Approve or reject a proposed action.
- Request a report or export.

The browser must not:

- Receive provider API keys.
- Receive a Stellar secret key.
- Decide whether a payment is permitted.
- Verify a payment only from client-provided data.
- Directly call privileged tool endpoints.

### Next.js server boundary

Route handlers and server-only modules own:

- Input validation.
- Provider selection.
- Agent orchestration.
- Tool allow-listing.
- Budget reservation.
- x402 payment signing and response verification.
- Persistence and redacted logging.

### External service boundary

Every external call is wrapped by an adapter that returns a domain result plus metadata. Raw provider-specific responses must not leak into UI components or the core agent state.

## Repository structure

```text
.
├── app/                                      # Next.js routes and page composition
│   ├── api/
│   │   ├── cases/                            # Create/read case state
│   │   ├── agent/                            # Plan, run, approve, pause
│   │   ├── payments/                          # Quotes and receipt views
│   │   └── health/                            # Local/deployment health
│   ├── error.tsx
│   ├── loading.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/                               # Client-facing UI only
│   ├── case/
│   ├── evidence/
│   ├── payments/
│   ├── report/
│   └── ui/
│
├── lib/                                      # Server/domain libraries
│   ├── agent/                                # State machine and orchestration
│   ├── ai/                                   # Provider interface and adapters
│   ├── config/                               # Validated environment access
│   ├── db/                                   # Repositories and migrations
│   ├── evidence/                             # Provenance and confidence rules
│   ├── payments/                             # x402/Stellar boundary
│   ├── policy/                               # Budgets and approval rules
│   ├── tools/                                # Tool interfaces and adapters
│   └── observability/                        # Redaction and event logging
│
├── services/                                 # Local paid-tool demo services
│   ├── risk-service/
│   └── translation-service/
│
├── tests/                                    # Offline and integration checks
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── scripts/                                  # Safe local setup and demo helpers
├── data/                                     # Local-only seed data, never secrets
├── docs/                                     # Product and engineering source of truth
├── public/                                   # Static browser assets
├── .env.example
├── .nvmrc
├── Dockerfile
├── docker-compose.yml
└── package-lock.json
```

## Domain model

The minimum domain objects are:

```text
Case
 ├── CaseRequest
 ├── AgentPlan
 │    └── AgentStep[]
 ├── EvidenceItem[]
 ├── Approval[]
 ├── PaymentAttempt[]
 └── FinalReport
```

### Case

Represents a user request and its lifecycle.

```ts
type Case = {
  id: string;
  title: string;
  requestText: string;
  status: CaseStatus;
  mode: "rules" | "local" | "groq" | "0g";
  network: "offline" | "stellar:testnet";
  budget: Budget;
  createdAt: string;
  updatedAt: string;
};
```

### Agent step

Represents one bounded action. A step is never executable solely because a model requested it.

```ts
type AgentStep = {
  id: string;
  toolId: string;
  purpose: string;
  input: Record<string, unknown>;
  requiresPayment: boolean;
  estimatedCostUsd?: string;
  requiresApproval: boolean;
  status: StepStatus;
};
```

### Evidence item

```ts
type EvidenceItem = {
  id: string;
  caseId: string;
  sourceType: "user" | "free-tool" | "paid-tool" | "model";
  sourceName: string;
  sourceUrl?: string;
  retrievedAt: string;
  freshness?: "live" | "recent" | "stale" | "unknown";
  summary: string;
  confidence: "high" | "medium" | "low";
  supportsStepIds: string[];
  contradictsEvidenceIds: string[];
  contentHash: string;
};
```

### Payment attempt

```ts
type PaymentAttempt = {
  id: string;
  caseId: string;
  stepId: string;
  network: "stellar:testnet";
  asset: string;
  amountAtomic: string;
  amountUsd: string;
  status: "proposed" | "approved" | "signed" | "settled" | "failed" | "rejected";
  transactionHash?: string;
  facilitatorReference?: string;
  createdAt: string;
};
```

Amounts are strings, never JavaScript floating-point numbers. The policy layer compares atomic units or decimal-safe values.

## Agent execution model

Use a bounded state machine:

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

Any state may transition to `PAUSED`, `BLOCKED`, or `FAILED`. Transitions are validated in code. The model can propose a transition but cannot bypass it.

## AI provider abstraction

```ts
interface LlmProvider {
  readonly id: "groq" | "local" | "0g";
  plan(input: PlannerInput): Promise<AgentPlan>;
  summarize(input: SynthesisInput): Promise<FinalReportDraft>;
}
```

Provider selection order:

1. Explicit deployment `APP_MODE` when configured.
2. The case-selected Groq, Local, or 0G provider.
3. Transparent rules planning when no real provider is requested.
4. A visible failed state when the selected real provider is unavailable.

Provider selection and failure decisions are recorded as case events. A provider failure must not silently create a different payment, evidence item, or repeated paid step. Test doubles belong under `tests/` only and are never imported by the application runtime.

## Tool registry

Tools implement a common interface:

```ts
interface AgentTool<I, O> {
  id: string;
  description: string;
  mode: "free" | "paid";
  inputSchema: unknown;
  outputSchema: unknown;
  execute(input: I, context: ToolContext): Promise<ToolResult<O>>;
}
```

Initial tools:

| Tool | Mode | Purpose |
| --- | --- | --- |
| `location.lookup` | Free | Resolve a human location with Nominatim/OpenStreetMap |
| `weather.current` | Free | Retrieve weather/rainfall context from Open-Meteo |
| `public.source.read` | Free | Fetch allow-listed public source content |
| `risk.analyze` | Paid | Demonstration x402 specialist service |
| `text.localize` | Free or paid | Produce bilingual output with clear translation metadata |

The model receives tool descriptions and schemas, not implementation secrets.

## x402 and Stellar flow

The first payment boundary is a server-side buyer calling a local or hosted x402 seller:

```text
Agent step
  → Tool adapter sends HTTP request
  → Seller returns 402 + payment requirements
  → Policy validates tool, asset, network, amount, and budget
  → Human approval if required
  → Stellar x402 client signs payment
  → Facilitator verifies/settles on Stellar Testnet
  → Adapter retries request with payment proof
  → Result + settlement receipt become evidence metadata
```

Target network: `stellar:testnet`.

Development RPC: `https://soroban-testnet.stellar.org`.

The implementation must pin compatible versions of the official x402 Stellar packages and verify the current testnet asset/facilitator configuration during integration. Documentation must not treat a transaction as settled merely because a payment header was created.

## API surface

Planned route handlers:

| Route | Method | Responsibility |
| --- | --- | --- |
| `/api/cases` | `POST` | Validate and create a case |
| `/api/cases/[id]` | `GET` | Read redacted case state |
| `/api/agent/plan` | `POST` | Generate and persist a plan |
| `/api/agent/run` | `POST` | Execute approved bounded steps |
| `/api/agent/approve` | `POST` | Approve/reject a specific action |
| `/api/agent/pause` | `POST` | Pause a running case |
| `/api/payments/[id]` | `GET` | Read a payment receipt |
| `/api/cases/[id]/export` | `GET` | Export Markdown or JSON |
| `/api/health` | `GET` | Report process and dependency health |

Route handlers validate request bodies and return stable domain errors. UI components never import provider SDKs.

## Persistence

Use a repository interface from the first implementation. The default local backend is SQLite because it is portable, free, and inspectable.

Required tables/collections:

- `cases`
- `agent_steps`
- `case_events`
- `evidence_items`
- `approvals`
- `payment_attempts`

The first vertical slice may use an in-memory repository behind the same interface. SQLite becomes required before multi-step resume or deployment.

## Error and retry rules

- Free GET-like reads may retry once with bounded backoff.
- Paid calls are idempotent by `caseId + stepId + paymentIntentId`.
- A provider timeout does not automatically trigger a second payment.
- A payment marked `settled` is never replayed for the same intent.
- A stale x402 quote causes a fresh quote, not a blind retry.
- Testnet reset or unavailable facilitator produces a visible degraded mode.
- Every failure creates a case event with a safe user message and a redacted technical code.

## Next.js-specific constraints

- Keep AI, payment, database, and secret-bearing modules server-only.
- Do not cache request-specific case state or payment responses.
- Review Cache Components and partial-prefetch behavior before adding dynamic routes.
- Keep browser components small and interactive; render stable report content on the server where possible.
- Avoid reading environment variables in client components unless they are intentionally public and prefixed accordingly.

## Observability

Each event should have:

- `caseId`
- `eventId`
- `eventType`
- `occurredAt`
- `actor`
- `status`
- `durationMs`
- redacted `errorCode`

Never log prompt contents, private keys, payment signatures, or full personal information by default.
