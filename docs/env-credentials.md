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
| `APP_MODE` | Yes | Choose `rules`, `grok`, `local`, or `0g` | Selects the default planner/provider mode |
| `NEXT_PUBLIC_APP_URL` | Hosted only | Your deployed URL | Correct metadata and share links |
| `XAI_API_KEY` | Only for Grok | [console.x.ai](https://console.x.ai/) | Server-side xAI credential |
| `XAI_MODEL` | Only for Grok | xAI model catalog/account | Model identifier such as `grok-4.7` |
| `XAI_BASE_URL` | Optional | Use `https://api.x.ai/v1` | xAI OpenAI-compatible API base |
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

## Grok: one API key, multiple models

Yes. A single xAI API key can be used to call multiple models that the same xAI account is allowed to access. The model is selected by the request's `model` value; the key identifies the account and does not permanently bind the request to one model.

ImpactRelay currently reads one server-side default model from:

```env
XAI_MODEL=grok-4.7
```

Changing `XAI_MODEL` changes the default model used by the Grok provider. For a future per-case model selector, the safe design is to maintain an explicit server-side allow-list of model IDs and validate the selected model before sending it to xAI. Do not accept arbitrary model IDs directly from the browser.

The current xAI model documentation lists text models including:

- `grok-4.7`
- `grok-4.6`
- `grok-4.5`
- `grok-4.3`
- `grok-4.20-0309-reasoning`
- `grok-4.20-0309-non-reasoning`
- `grok-build-0.1`

Model availability, capabilities, quotas, pricing, and structured-output support are account- and API-dependent. ImpactRelay should use a model that supports the structured JSON behavior required by the provider adapter. The official source of truth is the current [xAI model catalog](https://docs.x.ai/docs/models).

The xAI API does not guarantee a universally free quota. Use any free credits or trial quota shown in the account dashboard, but keep Rules mode as the no-cost fallback.

## How to get optional Grok credentials

1. Open [console.x.ai](https://console.x.ai/).
2. Create or sign in to an xAI account.
3. Review the current account quota, credits, and billing terms.
4. Create an API key from the API-key area.
5. Put it only in local/server environment configuration:

   ```env
   XAI_API_KEY=your-server-side-key
   XAI_MODEL=grok-4.7
   XAI_BASE_URL=https://api.x.ai/v1
   APP_MODE=grok
   ```

6. Never use `NEXT_PUBLIC_XAI_API_KEY`.
7. Never show the key in a screen recording.

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

### Public hosted Grok demo

Use the hosted Rules values plus:

```env
XAI_API_KEY=...
XAI_MODEL=grok-4.7
XAI_BASE_URL=https://api.x.ai/v1
```

Keep `APP_MODE=rules` if you want the site to remain usable when the Grok quota is unavailable. Select Grok only when the account has been tested.

## Deployment and demo placeholders

Fill these after deployment and recording:

```text
Live deployment: [ADD DEPLOYED URL]
Demo video: [ADD VIDEO URL]
```
