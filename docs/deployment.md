# Deployment and reproducibility

## Current Vercel setup

1. Import this Next.js repository and use the pinned Node 22 runtime line, `npm ci`, and `npm run build`.
2. Add server-side `DATABASE_URL`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and `RATE_LIMIT_MODE=required` in Vercel environment settings. Set `NEXT_PUBLIC_APP_URL` to the deployed HTTPS URL before building.
3. Choose `APP_MODE=rules` for the no-model demo, or `APP_MODE=groq` with `GROQ_API_KEY` and an account-accessible `GROQ_MODEL`. See [env-credentials.md](env-credentials.md) for account/model/free-tier caveats.
4. Keep secrets out of `NEXT_PUBLIC_*` and Git. Environment changes require restarting locally or redeploying on the host.
5. Run the [manual smoke checklist](manual-testing-guide.md) on the deployed URL, including create/plan/run/reopen/export, a different browser session, and an isolated real-Redis quota rejection test. `/api/health` alone checks configuration, not live service connectivity.

A successful local build does not prove hosted credentials, schema permissions, rate-limit persistence, or platform execution timeouts. Do not call the deployment verified until these live checks pass. Stellar/x402 sections below describe future integration work, not current runtime capabilities.

## Deployment strategy

ImpactRelay has three supported modes:

| Mode | Purpose | External credentials |
| --- | --- | --- |
| Rules local | Real user input, local SQLite, transparent rules planner | None |
| Local integrated | Real local model plus real tools, x402 seller, and Stellar Testnet | Optional provider and testnet secrets |
| Hosted demo | Public hackathon demonstration | Server-side secrets, compatible streaming host |

Rules local mode is the baseline. A deployment is not considered usable if it requires paid API credits or a functioning blockchain network to create and inspect a real case record. Missing integrations must degrade to an explicit blocked state, never to fabricated data. Production deployments require `DATABASE_URL` and configured Upstash Redis; the SQLite and unconfigured-rate-limit fallbacks are development-only.

## Runtime standard

Pin one Node.js LTS line consistently in:

- `.nvmrc`.
- `package.json` `engines`.
- Dockerfile.
- CI configuration.
- README commands.

The baseline is Node.js `22.14.0`, pinned in `.nvmrc`, Dockerfile, and CI. Use that runtime for clean-machine verification rather than assume tests on another installed Node version are equivalent.

Use npm because this repository has `package-lock.json`. Do not mix npm, pnpm, Yarn, and Bun instructions in the primary runbook.

## Local rules setup

Target runbook after implementation:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000` and submit a real request. No API key, wallet, hosted database, or hosted service is needed for local SQLite persistence and rules-based planning.

Target verification commands:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The implementation must make `npm test` fully offline and deterministic.

The current local rules workflow uses a system-font strategy and a local SQLite repository. External tools and providers remain explicit prerequisites for later phases.

## Local integrated setup

The integrated developer environment will contain:

```text
Next.js app       http://localhost:3000
Risk service      http://localhost:4021
Facilitator       http://localhost:4022 (if self-hosted)
Local model       configured separately, optional
Stellar Testnet   external network
```

The local risk service may use the official Stellar x402 examples as a reference. It must use a separate testnet wallet and a very small price. Never point a demo private key at Mainnet.

## Environment variables

The eventual `.env.example` must contain placeholders only. Planned server-only values:

| Variable | Required in rules mode | Purpose |
| --- | --- | --- |
| `APP_MODE` | Optional | `rules`, `local`, `groq`, or `0g`; when set, overrides browser selection |
| `GROQ_API_KEY` | No | Server-side Groq credential; required only in Groq mode |
| `GROQ_MODEL` | No | Groq model ID; verify account access and billing |
| `LOCAL_LLM_BASE_URL` | No | Local model server URL |
| `LOCAL_LLM_MODEL` | No | Local model identifier |
| `PUBLIC_SOURCE_ALLOWLIST` | No | Comma-separated HTTPS public-source host allow-list |
| `IMPACTRELAY_USER_AGENT` | No | Identifying user agent for public-source requests |
| `IMPACTRELAY_DB_PATH` | No | Local SQLite path override |
| `STELLAR_NETWORK` | No | Must be `stellar:testnet` for the MVP |
| `STELLAR_RPC_URL` | No | Stellar Testnet RPC endpoint |
| `STELLAR_PRIVATE_KEY` | No | Disposable server-side testnet signer |
| `STELLAR_PAY_TO_ADDRESS` | No | Testnet recipient for the local service |
| `X402_FACILITATOR_URL` | No | Facilitator endpoint |
| `RISK_SERVICE_URL` | No | Local/hosted paid service URL |
| `DATABASE_URL` | Hosted only | Neon PostgreSQL connection string, not a SQLite path |
| `UPSTASH_REDIS_REST_URL` | Hosted only | Upstash Redis REST endpoint |
| `UPSTASH_REDIS_REST_TOKEN` | Hosted only | Upstash Redis REST token |
| `RATE_LIMIT_MODE` | No | `required` in hosted production, `disabled` for local development |
| `REDIS_CACHE_PREFIX` | No | Redis namespace prefix |
| `OG_COMPUTE_API_KEY` | No | Server-only 0G Router `sk-` key |
| `OG_COMPUTE_BASE_URL` | No | 0G Router API base URL |
| `OG_COMPUTE_MODEL` | No | 0G Router model identifier |
| `OG_COMPUTE_TRUST_MODE` | No | Optional 0G trust tier, for example `private` |
| `LOG_LEVEL` | No | Redacted server log level |

Do not use `NEXT_PUBLIC_` for secrets. If a value is needed by the browser, expose a separate non-sensitive status value such as `NEXT_PUBLIC_DEMO_NETWORK=stellar:testnet`.

## Secret handling

- Keep `.env.local` outside Git.
- Commit `.env.example` only after `.gitignore` explicitly permits it.
- Use a disposable testnet signer for the demo.
- Never log private keys, payment headers, signed payloads, or full prompts.
- Rotate testnet keys if they appear in a public log or screen recording.
- Inject hosted secrets through the platform’s server-side environment configuration.
- Do not bake secrets into Docker layers, build arguments, or browser bundles.

## Docker plan

The repository now contains a production Dockerfile using Node.js `22.14.0`, npm lockfile installation, and a non-root runtime user. Runtime secrets are injected with `--env-file` or the hosting platform and are never copied into the image.

```bash
docker build -t impactrelay .
docker run --rm -p 3000:3000 --env-file .env.local impactrelay
```

The Dockerfile should:

1. Use the pinned Node LTS base image.
2. Install only project dependencies from the lockfile.
3. Build the Next.js app.
4. Run as a non-root user where supported.
5. Start with `npm run start`.
6. Receive runtime configuration through environment injection.

Docker Compose should be optional and intended for the integrated demo:

- `web`
- `risk-service`
- optional `facilitator`

The rules-based web experience must not require Compose.

## Hosted demo considerations

A free hosting provider may be used if its current terms support the project, but the provider is not part of the core architecture. Before selecting one, verify:

- Node.js runtime version.
- Route-handler execution timeout.
- Streaming support or polling fallback.
- Server-side environment variables.
- Ability to reach the x402 facilitator and Stellar RPC.
- Cold-start behavior.
- Logs do not expose secrets.

If a host cannot keep a long agent run alive, use short idempotent steps and persist each event so the UI can poll for progress.

## Stellar Testnet operations

Stellar Testnet is free for development and can be funded through Friendbot, but it resets periodically. Therefore:

- Treat all testnet accounts and transactions as disposable.
- Provide a setup script that can recreate or re-fund demo accounts.
- Display a reset/outage warning in integrated mode.
- Do not use Testnet as a long-term database.
- Verify network passphrase and asset configuration at startup.
- Make the network label visible in every payment view.

## Pre-demo checklist

- Start in Rules mode and verify the full local case flow.
- Fund the dedicated testnet signer.
- Verify the facilitator `/supported` response.
- Run one small testnet payment before the presentation.
- Confirm the transaction is visible on a compatible explorer.
- Keep a recorded local rules-mode demo as a fallback.
- Ensure the screen shows `Stellar Testnet`, not Mainnet.
- Revoke or rotate any key included in a temporary demo environment.

## Deployment definition of done

- A clean checkout can run rules mode with `npm ci`.
- The project has a pinned runtime and lockfile.
- Docker can build and start the application without absolute local paths.
- Real credentials are supplied at runtime only.
- Testnet failure degrades safely to a visible error or blocked state.
- README and this document contain commands that were actually run.
