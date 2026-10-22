# ImpactRelay

<p align="center">
  <img src="public/logo.png" alt="ImpactRelay logo" width="160" />
</p>

<h2 align="center">Evidence before confidence</h2>

<p align="center">
  An evidence-first AI caseworker for community-support requests.
</p>

<p align="center">
  <a href="https://impact-relay-olive.vercel.app/">Live demo</a> ·
  <a href="https://youtu.be/NPm6RePomjs">Demo video</a> ·
  <a href="docs/README.md">Documentation</a>
</p>

ImpactRelay turns an uncertain request into a bounded plan, retrieves live public signals, records provenance, and separates retrieved facts from human verification steps. It is designed for volunteers and small organizations that need a next action they can inspect and defend—not an opaque chatbot answer.

> **Current product boundary:** the casework, live free-tool, Neon, Redis, Rules, and Groq flows are implemented and tested. Stellar/x402 payments, authenticated accounts, and side-effecting actions are intentionally not implemented yet. The application never presents those future integrations as working.

## Live links

| Resource | Link |
| --- | --- |
| Hosted application | [impact-relay-olive.vercel.app](https://impact-relay-olive.vercel.app/) |
| Demo video | [Watch the ImpactRelay demo on YouTube](https://youtu.be/NPm6RePomjs) |

## The problem

Community volunteers often receive incomplete requests such as “find help near this area” or “check whether the situation is getting worse.” A conventional chatbot can produce fluent but unverified answers, stale links, or confident guesses. The hard part is not only generating text; it is preserving the trail from the original request to the next defensible action.

## The solution

ImpactRelay provides a reviewable case desk that:

- accepts the user’s real request instead of shipping scenario data;
- converts the request into bounded, read-only steps;
- calls live public sources for location, weather, nearby mapped resources, and allow-listed guidance pages;
- stores source URL, retrieval time, freshness, confidence, metadata, and a content hash;
- keeps failed and unavailable tools visible instead of inventing results;
- supports transparent Rules planning and optional server-side Groq, Local, and 0G providers;
- persists cases locally with SQLite or durably with Neon PostgreSQL;
- protects hosted routes with Upstash Redis rate limiting;
- gives each browser session an HttpOnly ownership boundary and JSON export;
- labels model output as synthesis and keeps source-backed evidence distinct from recommendations.

## Example use case

A volunteer receives:

> “Find nearby shelters and public guidance near Guwahati after heavy rain. Check the current weather and prepare a reviewable checklist. Do not claim that any resource is open or has capacity unless a source proves it.”

ImpactRelay can resolve the place through OpenStreetMap, retrieve current weather from Open-Meteo, attempt a nearby-resource search through Overpass, and produce a report that distinguishes:

1. **Retrieved signals** — what the live adapters returned.
2. **Human verification** — what a volunteer should confirm locally.
3. **Uncertainty** — unavailable services, unverified capacity, stale information, or missing context.

The example above is documentation only. Runtime cases come from the current user’s input and live adapter responses.

## Architecture

```mermaid
flowchart LR
    U[Volunteer browser] --> UI[Next.js App Router UI]
    UI --> API[Next.js route handlers]
    API --> S[Session ownership + Zod validation]
    S --> RL[Upstash Redis rate limit/cache]
    S --> DB[(Neon PostgreSQL<br/>or local SQLite)]
    API --> P[Provider selection]
    P --> R[Rules planner]
    P --> G[Groq / Local / 0G adapter]
    API --> T[Free-tool registry]
    T --> N[Nominatim]
    T --> W[Open-Meteo]
    T --> O[Overpass]
    T --> PS[Allow-listed public HTTPS sources]
    G --> V[Structured-output guardrails]
    T --> E[Validated evidence records]
    V --> M[Provider synthesis]
    E --> BR[Rules evidence brief]
    M --> REP[Evidence-linked report]
    BR --> DB
    REP --> DB
    DB --> UI
```

### Runtime data path

```mermaid
sequenceDiagram
    participant Volunteer
    participant Browser as Next.js UI
    participant API as Case API
    participant Store as Neon or SQLite
    participant Tools as Live public tools
    participant Model as Optional provider

    Volunteer->>Browser: Submit a real, redacted request
    Browser->>API: Create case with session cookie
    API->>Store: Persist request and lifecycle event
    Browser->>API: Request a bounded plan
    API->>Model: Plan only when a provider mode is selected
    API->>Store: Persist validated plan
    Volunteer->>Browser: Run available steps
    Browser->>API: Execute read-only tools
    API->>Tools: Fetch live source data
    Tools-->>API: Validated result or visible failure
    API->>Store: Persist evidence and audit events
    API->>Model: Synthesize only from stored evidence when configured
    API->>Store: Persist Rules brief or provider report
    Store-->>Browser: Case, evidence, uncertainty, and next actions
```

### Normal-user workflow

```mermaid
flowchart TD
    A[Open the live app] --> B[Create a case]
    B --> C[Review the generated plan]
    C --> D{Run available steps?}
    D -->|No| C
    D -->|Yes| E[Resolve location]
    E --> F[Fetch independent weather and resource signals]
    F --> G{Any valid evidence?}
    G -->|No| H[Blocked safely with failures visible]
    G -->|Yes| I[Store provenance and uncertainty]
    I --> J[Rules brief or validated provider synthesis]
    J --> K[Review, reopen, or export JSON]
```

## What is live and what is deterministic?

| Capability | Runtime behavior |
| --- | --- |
| Case input | Real user input, validated and persisted |
| Rules mode | Deterministic planner/report built from the current request and live evidence; no fake LLM response |
| Groq/Local/0G modes | Real OpenAI-compatible provider request with structured-output validation; failures are surfaced |
| Location | Live OpenStreetMap Nominatim request |
| Weather | Live Open-Meteo request using resolved coordinates |
| Nearby resources | Live OpenStreetMap Overpass request; availability is never claimed as verified |
| Public guidance | Live HTTPS request to a configured host allow-list |
| Database | SQLite locally; Neon when `DATABASE_URL` is configured |
| Rate limiting/cache | Upstash Redis when configured; production requires it |
| Payments | Not implemented; approval route intentionally reports that no payment target exists |

There are deterministic UI labels, empty states, documentation examples, and offline test fixtures. They are not presented as live case evidence. The application runtime does not import test fixtures or fabricate provider/source results.

## Technology stack

| Layer | Technology | Role |
| --- | --- | --- |
| Runtime | Node.js `22.14.0`, npm `11.x` | Pinned, reproducible JavaScript runtime |
| Web framework | Next.js `16.4.2` App Router | Pages, route handlers, server/client boundaries |
| UI | React `19.3.0`, Tailwind CSS `4.3.3` | Responsive case desk and landing page |
| Interaction | Framer Motion `12.43.0`, Lucide React | Accessible motion and interface icons |
| Validation | TypeScript `5.9.3`, Zod `4.6.7` | Domain contracts and provider/tool guardrails |
| Local persistence | Node SQLite / `data/impactrelay.sqlite` | Portable development storage |
| Hosted persistence | Neon Serverless `1.0.1` | Durable PostgreSQL case storage |
| Hosted infrastructure | Upstash Redis `1.34.4`, Ratelimit `2.0.7` | Cache and sliding-window route protection |
| Testing | Vitest `3.2.4`, Testing Library, Playwright `1.52.0` | Offline contracts and browser acceptance tests |
| Delivery | Docker, GitHub Actions, Vercel-compatible Next.js deployment | Reproducible build and hosted execution |

## AI providers

| Mode | Configuration | Notes |
| --- | --- | --- |
| Rules | `APP_MODE=rules` | No credentials; transparent deterministic planning and evidence brief |
| Groq | `GROQ_API_KEY`, `GROQ_MODEL` | Tested with `openai/gpt-oss-20b`; model access and quota remain account-specific |
| Local | `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL` | Any compatible local server |
| 0G | `OG_COMPUTE_API_KEY`, `OG_COMPUTE_BASE_URL`, `OG_COMPUTE_MODEL` | Optional server-only Router adapter with explicit trust routing |

`APP_MODE`, when set, overrides the provider selected in the browser. Remove it only when you want the browser choice to be honored. See [docs/env-credentials.md](docs/env-credentials.md) for safe configuration and live probes.

The active user-facing AI choices are Rules, Groq, Local, and 0G.

## Clean Linux rebuild & quick start

This project is fully rebuildable from scratch on a clean Linux machine with no external credentials required.

### 1. Requirements

- **Runtime**: Node.js `22.14.0` (pinned in [.nvmrc](.nvmrc) and [.node-version](.node-version))
- **Package Manager**: npm `>=10.0.0` (pinned in `package.json` engines)
- **Lockfile**: [package-lock.json](package-lock.json) (install with `npm ci`)

### 2. Setup

```bash
# Clone the repository
git clone https://github.com/thisisouvik/ImpactRelay.git
cd ImpactRelay

# Install exact dependencies from the lockfile
npm ci

# Configure local environment (default Rules mode requires zero credentials)
cp .env.example .env.local
```

### 3. Run

**Development server:**
```bash
npm run dev
# Open http://localhost:3000
```

**Production build and run:**
```bash
npm run build
npm start
# Open http://localhost:3000
```

**Docker build and run:**
```bash
docker build -t impactrelay .
docker run --rm -p 3000:3000 impactrelay
# Open http://localhost:3000
```

### 4. Test (one command)

Run the full offline unit and integration test suite with one command:
```bash
npm test
```

To run the complete production gate (linter, TypeScript typecheck, test suite, and production build):
```bash
npm run check
```

The gate runs ESLint, TypeScript, the offline Vitest suite, and the Next.js production build. Browser acceptance tests run separately:

```bash
npm run test:e2e
```

The normal browser suite uses an isolated Rules/SQLite server and does not consume provider quota. To opt into the real Nominatim/Open-Meteo browser test:

```bash
IMPACTRELAY_LIVE_TOOLS=1 npm run test:e2e
```

PowerShell:

```powershell
$env:IMPACTRELAY_LIVE_TOOLS = "1"
npm run test:e2e
Remove-Item Env:IMPACTRELAY_LIVE_TOOLS
```

For bounded live credential checks, use:

```bash
node scripts/check-integrations.mjs
node scripts/check-integrations.mjs --infer
```

The script prints only safe status, model availability, redacted provider error codes, and quota headers. It can check Groq, Neon `SELECT 1`, and Redis `PING`; it does not replace the full application smoke test.

## Hosted deployment

The deployed demo is at [impact-relay-olive.vercel.app](https://impact-relay-olive.vercel.app/). A production deployment should configure:

```env
APP_MODE=rules
NEXT_PUBLIC_APP_URL=https://your-domain.example
DATABASE_URL=your-neon-connection-string
UPSTASH_REDIS_REST_URL=https://your-upstash-endpoint
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
RATE_LIMIT_MODE=required
REDIS_CACHE_PREFIX=impactrelay
```

Production rejects the SQLite fallback and requires Redis-backed request protection. Add `GROQ_API_KEY` and `GROQ_MODEL` only when the account and model have been tested. See [docs/deployment.md](docs/deployment.md) for the Vercel checklist and [docs/manual-testing-guide.md](docs/manual-testing-guide.md) for the normal-user hosted smoke test.

The repository also includes a pinned Node 22 Dockerfile and GitHub Actions workflow:

```bash
docker build -t impactrelay .
docker run --rm -p 3000:3000 --env-file .env.local impactrelay
```

## Documentation directory

The [`docs/`](docs/README.md) directory is the product and engineering source of truth. It keeps scope, safety boundaries, deployment instructions, and decisions out of scattered code comments.

| Document | Purpose |
| --- | --- |
| [docs/README.md](docs/README.md) | Documentation index, rules, and current phase |
| [docs/idea.md](docs/idea.md) | Users, problem, product principles, and MVP boundary |
| [docs/design.md](docs/design.md) | Visual language, interaction model, and accessibility direction |
| [docs/technical architecture.md](docs/technical%20architecture.md) | System boundaries, data flow, and repository ownership |
| [docs/implementation.md](docs/implementation.md) | Implementation phases, acceptance criteria, and definition of done |
| [docs/deployment.md](docs/deployment.md) | Runtime pinning, Docker, hosted configuration, and deployment checks |
| [docs/env-credentials.md](docs/env-credentials.md) | Provider, Neon, Redis, and safe credential setup |
| [docs/manual-testing-guide.md](docs/manual-testing-guide.md) | Normal-user desktop, mobile, hosted, and live-tool checklist |
| [docs/testing.md](docs/testing.md) | Unit, integration, provider, tool, and browser test strategy |
| [docs/security.md](docs/security.md) | Privacy, prompt injection, session ownership, and payment boundaries |
| [docs/demo-runbook.md](docs/demo-runbook.md) | Reproducible recording and judging flow |
| [docs/0g-implementation.md](docs/0g-implementation.md) | Implemented 0G Compute boundary and deferred 0G Storage work |
| [docs/decisions/](docs/decisions/) | Architecture decision records that should not be silently reversed |

## Repository layout

```text
app/                 Next.js pages, route handlers, and global styles
components/          UI, landing, case, evidence, and dashboard components
lib/                 Domain schemas, repositories, providers, tools, security, and infrastructure
scripts/             Explicit live integration diagnostics
services/            Reserved boundaries for future paid specialist services
tests/               Offline unit/integration tests and Playwright acceptance tests
docs/                Product, architecture, security, deployment, and testing documentation
public/              Logo and browser assets
Dockerfile           Reproducible Node 22 production image
```

Generated build output, local databases, test results, environment files, dependencies, and TypeScript build metadata are ignored by Git. Empty `.gitkeep` placeholders are intentionally not part of the repository; directories appear when their first meaningful file is added.

## Current boundaries and roadmap

### Implemented now

- Real user-created case records and session-scoped ownership.
- Rules planning and evidence brief generation.
- Groq structured planning/report workflow.
- Live location, weather, nearby-resource, and allow-listed public-source adapters.
- Neon persistence and Upstash Redis rate limiting/cache.
- Partial-failure handling, evidence provenance, JSON export, and responsive case review.
- Offline contract tests, live-tool browser tests, production build, and CI checks.

### Deliberately deferred

- Stellar Testnet and x402 seller/buyer/payment settlement.
- User accounts, team permissions, account recovery, and retention management.
- Automatic emergency dispatch or side-effecting actions.
- 0G Storage archival and encrypted decentralized export.

The app is complete as an evidence-first casework demo and not yet a complete payment-enabled SaaS product. That boundary is intentional and visible in the UI and documentation.

## License and contribution note

This repository is a hackathon project. Keep changes focused, preserve the no-fabrication boundary, update the relevant documentation, and run `npm run check` before handing off work. Do not commit `.env`, local database files, provider keys, private data, or generated build artifacts.
