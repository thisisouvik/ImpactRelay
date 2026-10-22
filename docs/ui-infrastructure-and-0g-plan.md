# ImpactRelay UI, infrastructure, and 0G integration plan

## Decision summary

ImpactRelay will use:

- A public landing page at `/`.
- A multi-route application instead of one monolithic workspace.
- shadcn-style UI primitives with shared design tokens.
- Framer Motion for restrained, accessible interaction design.
- System theme by default with light/dark/manual theme controls.
- SQLite for local development.
- Neon PostgreSQL for Vercel persistence.
- Upstash Redis for rate limits and safe, short-lived cache entries.
- Rules, Groq, and Local providers unchanged.
- 0G Compute Router as an optional server-side AI provider.
- 0G Storage as an optional encrypted archive layer, not the operational database.

No runtime demo cases, fake evidence, fake receipts, or fabricated provider output may be added.

## Why 0G fits ImpactRelay

The official 0G documentation describes four relevant layers:

1. **0G Chain** — EVM-compatible chain designed for AI workloads.
2. **0G Compute** — decentralized inference marketplace and Router API.
3. **0G Storage** — decentralized file storage with Merkle-root/proof workflows.
4. **0G DA** — data availability infrastructure for high-throughput applications.

The strongest immediate fit is **0G Compute Router** because it provides:

- An OpenAI-compatible chat completions API.
- One server-side API key.
- Provider routing and failover.
- Unified 0G billing.
- Optional private trust routing for TeeML providers.
- A natural fit for an AI-agent backend.

The official testnet Router endpoint is:

```text
https://router-api-testnet.integratenetwork.work/v1
```

The mainnet endpoint is:

```text
https://router-api.0g.ai/v1
```

The `sk-` API key must remain server-side. It must never be sent to the browser.

## 0G integration boundary

```text
Browser
  → ImpactRelay API
    → 0G Router provider adapter
      → structured response guardrails
        → evidence-linked report
          → Neon case record
```

ImpactRelay will not allow a 0G response to create source evidence by itself. A 0G response is model synthesis and may only reference evidence IDs already returned by real tools.

When private trust routing is enabled:

```text
X-0G-Provider-Trust-Mode: private
```

If a private provider is unavailable, the case fails visibly. It does not silently downgrade to a lower trust tier.

## 0G Storage boundary

0G Storage is useful for an explicit archive action:

```text
Completed report
  → user chooses archive
    → encrypt export
      → upload encrypted artifact to 0G Storage
        → persist root hash and transaction metadata in Neon
```

It will not replace Neon because the application needs mutable queries, filtering, status updates, and relational case state.

The archive feature must:

- Require explicit user action.
- Encrypt before upload.
- Avoid uploading raw sensitive prompts.
- Store the root hash and upload metadata in Neon.
- Support proof-backed retrieval.
- Remain disabled until the storage adapter is verified.

## Route architecture

```text
/
  Public landing page

/workspace
  Dashboard and operational overview

/cases
  Case list and filters

/cases/new
  Real case creation flow

/cases/[id]
  Case detail, plan, events, evidence, report

/settings/integrations
  Provider, database, Redis, and 0G health
```

## UI implementation

Add reusable primitives under `components/ui/`:

- Button.
- Card.
- Badge.
- Input.
- Textarea.
- Select.
- Tabs.
- Dialog.
- Sheet.
- Tooltip.
- Separator.
- Alert.
- Progress.
- Skeleton.

Add:

- `ThemeProvider` with system default.
- Theme toggle for system/light/dark.
- Motion reveal component.
- Reduced-motion support.
- Shared landing and application navigation.

## Database implementation

### Local

```text
SQLiteCaseRepository
```

### Vercel

```text
NeonCaseRepository
```

The repository contract remains shared across both implementations.

Production selection:

```text
DATABASE_URL exists → Neon
otherwise           → SQLite
```

Neon tables:

- `cases`
- `case_events`
- `agent_steps`
- `evidence_items`
- `reports`
- `approvals`
- `payment_attempts`

## Redis implementation

Use Upstash Redis through REST-compatible server-side clients.

Rate-limit protected routes:

- Case creation.
- Agent planning.
- Agent execution.
- Approval operations.
- Export operations.

Safe cache entries:

- Public integration metadata.
- 0G model catalog.
- Provider availability.
- Health snapshots.

Never cache:

- Raw case prompts.
- Private evidence payloads.
- Payment signatures.
- Wallet keys.
- Full model transcripts.

## Required environment variables

```text
DATABASE_URL=

UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
RATE_LIMIT_MODE=required
REDIS_CACHE_PREFIX=impactrelay

OG_COMPUTE_API_KEY=
OG_COMPUTE_BASE_URL=https://router-api-testnet.integratenetwork.work/v1
OG_COMPUTE_MODEL=
OG_COMPUTE_TRUST_MODE=private
```

## Test plan

### UI

- Landing page renders.
- Landing CTA navigation.
- System theme default.
- Manual theme switching.
- Reduced motion.
- Mobile navigation.
- Keyboard focus.
- New case route.
- Case detail route.
- Cases list route.
- 0G education route.
- Integrations status route.

### Infrastructure

- SQLite and Neon repository contract parity.
- Neon migration execution.
- Redis rate-limit allow/deny behavior.
- Redis missing/degraded behavior.
- Safe cache TTL behavior.
- No sensitive payloads in Redis.

### 0G

- Provider uses server-side `sk-` key.
- Provider sends configured base URL.
- Private trust header is sent when enabled.
- Structured plan/report guardrails apply.
- Invalid 0G output is rejected.
- 0G `429` responses respect `Retry-After`.
- Missing balance/model/provider fails visibly.
- No 0G secret appears in client bundles.

## Official 0G references

- [0G Getting Started](https://docs.0g.ai/developer-hub/getting-started)
- [0G Compute Router](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/overview)
- [0G Router Quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)
- [0G Router Authentication](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/authentication)
- [0G Router Privacy and ZDR](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)
- [0G Router Rate Limits](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/rate-limits)
- [0G Storage SDK](https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk)
- [0G Galileo Testnet](https://docs.0g.ai/developer-hub/testnet/testnet-overview)
