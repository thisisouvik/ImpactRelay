# Free environment credentials and deployment setup

This guide explains which environment values ImpactRelay needs, where to obtain them, and which ones are optional.

Do not paste real credentials into GitHub, README files, screenshots, demo videos, chat messages, or committed `.env` files. Create `.env.local` locally and add the same values through the deployment platform's encrypted environment-variable settings.

## Fastest path: no credentials

For local development and the safest recording fallback, use Rules mode:

```env
APP_MODE=rules
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

This path uses:

- The transparent Rules planner.
- Local SQLite.
- OpenStreetMap Nominatim for location lookup.
- OpenStreetMap Overpass for optional nearby-resource lookup.
- Open-Meteo for weather context.
- The configured public-source allow-list.

No AI-provider key, Neon account, Upstash account, wallet, or payment credential is required for this local path.

## Environment variable reference

| Variable | Required now? | Where to get it | Purpose |
| --- | --- | --- | --- |
| `APP_MODE` | Optional | Choose `rules`, `groq`, `local`, or `0g` | When set, overrides the browser choice for every new case; unset to allow selection |
| `NEXT_PUBLIC_APP_URL` | Hosted only | Your deployed URL | Correct metadata and share links |
| `GROQ_API_KEY` | Only for Groq | [console.groq.com/keys](https://console.groq.com/keys) | Server-side Groq credential |
| `GROQ_MODEL` | Optional for Groq | Groq model catalog/account | Defaults to `llama-3.3-70b-versatile`; verify account access first |
| `LOCAL_LLM_BASE_URL` | Only for Local | Local runtime address | OpenAI-compatible local server |
| `LOCAL_LLM_MODEL` | Only for Local | Your local runtime | Local model identifier |
| `OG_COMPUTE_API_KEY` | Only for 0G | [pc.0g.ai](https://pc.0g.ai/) | Server-side 0G Router `sk-` credential |
| `OG_COMPUTE_BASE_URL` | Only for 0G | Current 0G Router documentation | 0G Router API base URL |
| `OG_COMPUTE_MODEL` | Only for 0G | 0G live model catalog | 0G model identifier |
| `OG_COMPUTE_TRUST_MODE` | Optional for 0G | Choose `private` when supported | 0G provider trust tier |
| `DATABASE_URL` | Hosted production | Neon project connection string | Durable PostgreSQL persistence |
| `UPSTASH_REDIS_REST_URL` | Hosted production | Upstash Redis database | REST endpoint for rate limits/cache |
| `UPSTASH_REDIS_REST_TOKEN` | Hosted production | Upstash Redis database | Server-side REST authentication |
| `RATE_LIMIT_MODE` | Hosted production | Set manually | Use `required` in production |
| `REDIS_CACHE_PREFIX` | Optional | Set manually | Redis namespace, for example `impactrelay` |

## Groq Llama configuration and free-tier limits

`llama-3.3-70b-versatile` is Meta Llama hosted by **Groq**. Groq requests use `https://api.groq.com/openai/v1`.

```env
APP_MODE=groq
GROQ_API_KEY=your-server-side-groq-key
GROQ_MODEL=llama-3.3-70b-versatile
```

Restart the server after changing these values. `APP_MODE=rules` forces Rules even when Groq is selected in the form; set `groq` or remove `APP_MODE` to permit browser selection. There is no automatic provider credential fallback.

**Do not assume this Llama model is free.** As checked on October 19, 2026, Groq's [model catalog](https://console.groq.com/docs/models) labels Llama 3.3 70B as Enterprise / Contact Sales, and its [Free Plan limits table](https://console.groq.com/docs/rate-limits) does not list it. An authenticated key does not guarantee access to every model. A `404 model_not_found` can mean the model is unavailable to that account. Do not silently substitute another model.

The published Free Plan table currently lists `openai/gpt-oss-20b` and `openai/gpt-oss-120b` at 30 requests/minute, 1,000 requests/day, 8,000 tokens/minute, and 200,000 tokens/day. These are provider-published reference limits, not a guarantee for your account; check the [account limits page](https://console.groq.com/settings/limits), billing plan, and model permissions before choosing a replacement. Model compatibility with the complete plan/report workflow must still be tested.

### Safe live credential checks

Run from the repository root. This loads environment files in Next.js order and reports only redacted results:

```bash
node scripts/check-integrations.mjs
# Optional: sends one tiny inference request (may consume quota or incur charges).
node scripts/check-integrations.mjs --infer
```

The default checks Groq authentication/model listing, Neon with a read-only `SELECT 1`, and Redis with `PING`. It does **not** prove database schema/write access, application-level plan/report output, billing, or rate-limit enforcement. Missing configuration or an unavailable model exits nonzero. `--production` selects production environment-file precedence. The optional inference probe uses a small 256-token output ceiling; it may consume quota or incur charges.

Do not create a second `.env.local` from the example over an already configured `.env` without checking precedence: `.env.local` overrides `.env`, including with empty values.

## How to get optional 0G Compute credentials

The current 0G Router quickstart describes this flow:

1. Connect a wallet at [pc.0g.ai](https://pc.0g.ai/).
2. Deposit 0G into the Router account.
3. Create an `sk-` API key in the dashboard.
4. Select a model from the live 0G model catalog.
5. Configure the server environment:

   ```env
   OG_COMPUTE_API_KEY=sk-your-key
   OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
   OG_COMPUTE_MODEL=your-supported-model
   OG_COMPUTE_TRUST_MODE=private
   APP_MODE=0g
   ```

0G Router usage is not assumed to be free. Check the current dashboard balance, model pricing, and trust-tier availability before a demo. If private capacity is unavailable, ImpactRelay should fail visibly instead of silently switching to a lower-trust route.

Official references:

- [0G Router quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)
- [0G Router models](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/models)
- [0G privacy and zero data retention](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)

## Do we need Neon now?

### Local development: no

You do not need Neon while developing locally. SQLite is simpler, portable, and works without network credentials.

### Hosted production: yes

You should configure Neon before deploying a public production demo because:

- Serverless instances are not a durable place to keep SQLite files.
- Deployments can restart or scale across instances.
- Judges should be able to create a case and retrieve it consistently.
- Production code now rejects the SQLite fallback when `NODE_ENV=production`.

To get a Neon connection string:

1. Create a project at [neon.tech](https://neon.tech/).
2. Choose the free plan if it still fits the current account limits.
3. Copy the pooled PostgreSQL connection string.
4. Add it to your hosting provider as:

   ```env
   DATABASE_URL=postgresql://...
   ```

Do not commit the connection string. Neon free-plan limits and terms can change, so check the current dashboard before deployment.

## Do we need Upstash Redis now?

### Local development: no

Local development can run without Redis. The local rate-limit/cache layer degrades according to the configured development mode.

### Hosted production: yes

Configure Upstash Redis before making the application public because production requires rate limiting. Redis is used for:

- Protected route rate limits.
- Short-lived case-list cache entries scoped by browser session.
- Future public integration metadata caches.

To get Upstash values:

1. Create an account at [console.upstash.com](https://console.upstash.com/).
2. Create a Redis database in a region close to the deployment.
3. Copy the REST URL and REST token from the database dashboard.
4. Add them to the host:

   ```env
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   RATE_LIMIT_MODE=required
   REDIS_CACHE_PREFIX=impactrelay
   ```

The free plan may be enough for a judge demo, but verify the current request and storage limits.

### What the application limiter enforces

- Case creation, planning, and execution each have a Redis sliding-window limit of 20 requests/minute per route and client identifier.
- On Vercel, the identifier comes from the platform's dedicated `x-vercel-forwarded-for` header. Other hosts currently use one shared `anonymous` bucket rather than trust arbitrary forwarded headers; configure a trusted ingress strategy before scaling elsewhere.
- Development `RATE_LIMIT_MODE=disabled` bypasses limiting. Production always requires Redis, even if `disabled` was accidentally set.
- Genuine quota exhaustion returns `429 RATE_LIMITED` with `Retry-After`. Missing required Redis, authentication failures, and SDK timeouts fail closed with `503 RATE_LIMIT_UNAVAILABLE` and no raw Redis errors.
- This is not a provider-wide token/day quota, spending cap, or protection for every route. Plan and report calls, retries, and multiple visitors can still exhaust Groq's organization-wide limits. Set account-level spend limits and monitor the provider dashboard.

For a real-Redis rejection check, use an isolated test deployment with `RATE_LIMIT_MODE=required` and a unique `REDIS_CACHE_PREFIX`. Send 21 sequential JSON `{}` POSTs to `/api/agent/plan` from one client within a minute bucket: the first 20 should return validation `400`, then `429` with `Retry-After`. Invalid input prevents database writes or inference. Separately test a deliberately invalid Redis token in that isolated environment; expect a generic `503`, not raw authentication errors. Restart between configurations and let test keys expire; never flush a shared Redis database.

## Recommended deployment combinations

### Free no-key local recording

```env
APP_MODE=rules
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Public hosted Rules demo

```env
APP_MODE=rules
NEXT_PUBLIC_APP_URL=https://your-domain.example
DATABASE_URL=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_MODE=required
REDIS_CACHE_PREFIX=impactrelay
```

### Public hosted Groq demo

Use the hosted Rules values plus:

```env
APP_MODE=groq
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-20b
```

Keep `APP_MODE=rules` for a forced no-key demo; that setting does not automatically fall back from another provider and overrides browser selection. Unset it only if you intend to permit selection among server-configured providers.

## Deployment and demo placeholders

Fill these after deployment and recording:

```text
Live deployment: [ADD DEPLOYED URL]
Demo video: [ADD VIDEO URL]
```
