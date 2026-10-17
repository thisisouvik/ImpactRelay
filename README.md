# ImpactRelay

ImpactRelay is an evidence-first AI caseworker for community assistance. It turns a messy request into a bounded action plan, gathers evidence from free and paid services, and records the result—including small Stellar x402 testnet payments—in a reviewable case file.

The repository now contains the first real case workflow. A user can submit a request, persist it in local SQLite, generate a transparent rules-based plan, inspect lifecycle events, and export the stored record. External tools, model providers, wallet signing, and blockchain payments are intentionally not represented as working until their real adapters are implemented.

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

[Documentation index](docs/README.md)

## Current stack

- Next.js `16.4.2` App Router
- React `19.3.0`
- TypeScript
- Tailwind CSS `4`
- npm with the committed `package-lock.json`

Planned integrations are intentionally provider-abstracted:

- Grok through the server-side xAI API when a valid key or hackathon credit is available.
- An open-source local model runtime for no-key development.
- A transparent rules planner for the current local workflow.
- Stellar Testnet and x402 for bounded machine-to-machine payments.
- SQLite for a portable local case and receipt store.

The xAI API may not provide a universally free quota. The project must remain runnable without xAI credits; Grok is an optional real provider, not a single point of failure. When a real provider or tool is unavailable, the application must show a safe boundary instead of fabricating a result.

## Existing checks

Run from the repository root:

```bash
npm run lint
npx --no-install tsc --noEmit --incremental false
```

The lint, typecheck, test, and build commands are now configured. The current build uses a local/system font strategy and the first case workflow is covered by unit and SQLite integration tests.

Run `npm ci` on Node.js 22 before using the test and browser commands. The application currently uses local SQLite and the rules planner; external integrations will be added only with real adapters and their own verification.

## Repository status

The planned structure is tracked now with placeholders so the implementation can start from an explicit boundary. Empty folders contain `.gitkeep` files until their first source file is added. See the [technical architecture](docs/technical%20architecture.md) for the intended ownership of each directory.
