# ImpactRelay

<p align="center">
  <img src="public/logo.png" alt="ImpactRelay logo" width="150" />
</p>

<h2 align="center">ImpactRelay · Evidence before confidence</h2>

ImpactRelay is an evidence-first AI caseworker for community assistance. It turns an uncertain request into a bounded plan, retrieves live public signals, separates verified facts from recommendations, and keeps a reviewable case record.

## The problem our AI agent solves

Community volunteers often receive incomplete, urgent requests such as “find help near this area” or “check whether the situation is getting worse.” A normal chatbot can produce fluent but unverified answers, stale links, or confident guesses.

ImpactRelay addresses that problem by:

- turning the user's real request into small, read-only steps;
- querying live public sources instead of shipping scenario fixtures;
- storing retrieval time, source URL, freshness, confidence, and content hashes;
- keeping failed or unavailable tools visible;
- separating source-backed facts, human verification actions, and uncertainty;
- keeping provider keys server-side and execution bounded.

The current product does not claim to complete payments or side effects. Stellar/x402 payment integration remains a future boundary and is not represented as working in the runtime.

## Project direction

The first demonstration will help a volunteer assess an urgent community-support request. The agent will:

1. Understand and structure the request.
2. Plan a small number of verifiable subtasks.
3. Call free public-data tools.
4. Ask for approval before a paid tool call.
5. Pay an allow-listed x402 service with Stellar Testnet assets.
6. Combine evidence, confidence, uncertainty, and next actions.

The product is deliberately not an unrestricted autonomous agent. Human approval, spending limits, evidence provenance, and fail-closed behavior are part of the product—not later additions. The running application does not ship hardcoded case examples, fabricated evidence, synthetic receipts, or fake provider responses.

## Documentation first

Read the documents in this order before writing application code:

1. [Idea](docs/idea.md) — problem, users, value proposition, scope, and demo story.
2. [Design](docs/design.md) — visual language, interaction model, accessibility, and distinctive UI direction.
3. [Technical architecture](docs/technical%20architecture.md) — boundaries, data flow, integrations, and repository structure.
4. [Implementation plan](docs/implementation.md) — phased build sequence and acceptance criteria.
5. [Deployment plan](docs/deployment.md) — free/local environments, secrets, and testnet operations.
6. [Security](docs/security.md) — payment, prompt-injection, privacy, and agent safety.
7. [Testing](docs/testing.md) — offline-first verification and the eventual end-to-end checks.
8. [Architecture decisions](docs/decisions/) — short records for choices that should not be silently reversed.
9. [Manual testing](docs/manual-testing-guide.md) — normal-user local and hosted verification steps.

[Documentation index](docs/README.md)

## Current stack

- Node.js `22.14.0` pinned in `.nvmrc`
- npm `11.x`
- Next.js `16.4.2` App Router
- React `19.3.0`
- TypeScript `5.9.3`
- Tailwind CSS `4.3.3`
- Zod `4.6.7`
- Framer Motion `12.43.0`
- Lucide React `0.511.0`
- next-themes `0.4.4`
- Vitest `3.2.4`
- Playwright `1.52.0`
- Neon Serverless driver `1.0.1`
- Upstash Ratelimit `2.0.7`
- Upstash Redis `1.34.4`
- npm with the committed `package-lock.json`

## AI agent tools

The runtime tool registry currently supports these real, bounded tools:

| Tool ID | Live source | What it does |
| --- | --- | --- |
| `location.lookup` | OpenStreetMap Nominatim | Resolves a place into coordinates and a display name |
| `weather.current` | Open-Meteo | Retrieves current weather after location resolution |
| `resources.nearby` | OpenStreetMap Overpass | Attempts to find nearby mapped shelters, hospitals, food, water, and social resources |
| `public.source.read` | HTTPS sources from the configured allow-list | Reads a supplied public guidance page with redirect and size checks |

Tool results are validated before becoming evidence. A source outage is shown as a failed or partial step; it is never converted into fake data.

## Supported AI providers and models

| Provider | Supported model configuration | Status |
| --- | --- | --- |
| Rules | Built-in deterministic planner and evidence brief | Available with no credentials |
| Local | Any OpenAI-compatible local model configured with `LOCAL_LLM_MODEL` | Optional; model depends on the local runtime |
| Grok / xAI | `grok-4.7`, `grok-4.6`, `grok-4.5`, `grok-4.3`, `grok-4.20-0309-reasoning`, `grok-4.20-0309-non-reasoning`, `grok-build-0.1` | Optional; account access and structured-output capability must be checked |
| 0G Compute Router | A model returned by the live 0G `/v1/models` catalog | Optional; model and trust-tier availability changes over time |

One xAI API key can be used with multiple models permitted for the same account. ImpactRelay currently selects one server-side default via `XAI_MODEL`; the browser cannot choose arbitrary model IDs. See [docs/env-credentials.md](docs/env-credentials.md) for credential setup and official model references.

Model availability, quotas, pricing, and free credits are controlled by each provider and can change. Rules mode remains the no-key fallback.

Planned integrations are intentionally provider-abstracted:

- Grok through the server-side xAI API when a valid key or hackathon credit is available.
- An open-source local model runtime for no-key development.
- A transparent rules planner for the current local workflow.
- A server-only Grok adapter and OpenAI-compatible local provider with structured output validation.
- Stellar Testnet and x402 for bounded machine-to-machine payments.
- SQLite for a portable local case and receipt store.

The xAI API may not provide a universally free quota. The project must remain runnable without xAI credits; Grok is an optional real provider, not a single point of failure. When a real provider or tool is unavailable, the application must show a safe boundary instead of fabricating a result.

## Today’s working demo

The no-credential Rules path now supports real location resolution, nearby mapped resource discovery, current weather context, provenance metadata, and a transparent evidence brief. Follow [docs/demo-runbook.md](docs/demo-runbook.md) to rehearse and record the flow. The current 0G boundary and official documentation links are in [docs/0g-implementation.md](docs/0g-implementation.md).

## Deployment and demo links

Add these after the hosted deployment and recording are complete:

- **Live deployment:** `[ADD DEPLOYED URL]`
- **Demo video:** `[ADD DEMO VIDEO URL]`

## Social media posts

Add product-launch and demo posts here later:

- **X / Twitter:** `[ADD POST URL]`
## Existing checks

Run from the repository root:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000` and use `/cases/new` for the real case workflow.

The lint, typecheck, test, and build commands are now configured. The current build uses a local/system font strategy and the first case workflow is covered by unit and SQLite integration tests.

The repository also includes a pinned Node 22 Docker build and GitHub Actions workflow:

```bash
docker build -t impactrelay .
docker run --rm -p 3000:3000 --env-file .env.local impactrelay
```

Run the full offline production gate with:

```bash
npm run check
```

Run `npm ci` on Node.js 22 before using the test and browser commands. The application currently uses local SQLite and the rules planner; external integrations will be added only with real adapters and their own verification.

For hosted production, configure `DATABASE_URL` for Neon and the two Upstash Redis values before deploying. Production rejects the SQLite fallback and requires rate limiting. See [docs/env-credentials.md](docs/env-credentials.md) and [docs/deployment.md](docs/deployment.md).

## Repository status

The planned structure is tracked now with placeholders so the implementation can start from an explicit boundary. Empty folders contain `.gitkeep` files until their first source file is added. See the [technical architecture](docs/technical%20architecture.md) for the intended ownership of each directory.
