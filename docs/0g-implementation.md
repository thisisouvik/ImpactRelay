# 0G implementation in ImpactRelay

## Today’s implementation boundary

ImpactRelay uses 0G as an optional, server-only intelligence layer. The application remains useful without a 0G account through its transparent Rules agent and free public-data tools.

```text
Browser
  → ImpactRelay case API
    → provider adapter (Rules, Groq, Local, or 0G)
      → structured plan guardrails
        → real free-tool evidence
          → evidence-linked action brief
            → case record
```

The browser never receives a 0G or provider secret. A model response cannot create evidence by itself: it may only reference evidence IDs already returned by a real adapter.

## Current 0G Compute integration

The current adapter is `lib/ai/og-provider.ts`. It uses the OpenAI-compatible 0G Router API for structured planning and report synthesis.

Required server-only values:

```env
OG_COMPUTE_API_KEY=sk-...
OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
OG_COMPUTE_MODEL=your-supported-model
OG_COMPUTE_TRUST_MODE=private
```

The official 0G Router quickstart describes the following setup:

1. Connect a wallet at [pc.0g.ai](https://pc.0g.ai).
2. Deposit 0G into the Router account.
3. Create an `sk-` API key. The Router does not show it again.
4. Call `POST /v1/chat/completions` with the OpenAI-compatible request shape.

The documented mainnet endpoint is `https://router-api.0g.ai/v1`. Use the value from the current 0G dashboard or documentation for any testnet Router environment; do not guess an endpoint in a production deployment.

## Why 0G matters here

### Private case planning

ImpactRelay may handle sensitive community-support requests. 0G’s `private` trust mode routes to TeeML providers and is designed for sealed inference. The request and completion are processed in memory by the Router; billing and operational metadata still exist.

ImpactRelay must still redact or encrypt sensitive data before storing it in SQLite or Neon. 0G privacy does not automatically encrypt ImpactRelay’s own database.

### Decentralized provider routing

The Router gives ImpactRelay one OpenAI-compatible interface while routing inference across the available 0G provider network. This makes the AI provider replaceable without changing the case workflow.

### Verifiable inference metadata

0G responses include an `x_0g_trace` object with a request ID, provider address, billing values, and optional TEE verification. The next 0G hardening step is to persist this metadata as a redacted case event without storing full prompts or model transcripts.

### Encrypted case archives

0G Storage is a future explicit archive action, not the operational database:

```text
Completed report
  → remove secrets and sensitive raw fields
    → encrypt export
      → upload to 0G Storage
        → store Merkle root and transaction metadata in Neon
```

The Storage SDK supports TypeScript, Merkle roots, proof-backed downloads, AES-256 encryption, and ECIES encryption. This should be implemented only after the Compute path is verified.

## Today’s free demo path

The demo does not depend on a paid model or 0G credentials:

1. Open `/cases/new`.
2. Choose **Rules planner**.
3. Submit a real or redacted request, for example:

   ```text
   Find nearby shelters and public guidance near Guwahati after heavy rain, then prepare a reviewable checklist for a volunteer.
   ```

4. The agent derives a bounded plan.
5. It resolves the location with OpenStreetMap Nominatim.
6. It searches nearby mapped shelters, hospitals, food, water, and social resources through OpenStreetMap Overpass.
7. It retrieves current weather from Open-Meteo when requested.
8. It records source URLs, retrieval times, freshness, confidence, hashes, distances, and an explicit “availability not verified” boundary.
9. It generates a transparent Rules action brief with:
   - source-backed known facts;
   - human verification actions;
   - uncertainty statements;
   - no fabricated availability or safety claims.

This path is the reliable fallback for a recorded demo because it needs no API key, wallet, hosted database, or paid service.

## Optional Groq and 0G modes

If a valid server-side Groq key and account-accessible model are available, set `APP_MODE=groq`, configure the `GROQ_*` values, and select Groq in the case form. If a funded 0G Router account and supported model are available, set `APP_MODE=0g`, configure the 0G values above, and select 0G.

Both provider modes use the same guardrails:

- plans can only select registered read-only tools;
- tool input is derived from the submitted case, not blindly trusted from the model;
- report evidence references must match stored evidence IDs;
- provider failures are visible and never silently downgraded;
- keys remain server-side.

## Next 0G hardening steps

1. Add live `/v1/models` discovery and cache only the public model catalog.
2. Check model support for JSON mode, tool calling, and TeeML before enabling a mode.
3. Capture and persist `x_0g_trace` metadata.
4. Add an opt-in `verify_tee: true` setting for sensitive cases.
5. Track 0G neuron billing separately from ImpactRelay’s USD budget until a trusted exchange-rate source exists.
6. Add encrypted 0G Storage archive and proof-backed retrieval.

## Official sources

- [0G Getting Started](https://docs.0g.ai/developer-hub/getting-started)
- [Router Quickstart](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/quickstart)
- [Router Models](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/models)
- [Chat Completions](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/features/chat-completions)
- [Privacy and Zero Data Retention](https://docs.0g.ai/developer-hub/building-on-0g/compute-network/router/privacy)
- [Storage SDK](https://docs.0g.ai/developer-hub/building-on-0g/storage/sdk)
- [Galileo Testnet](https://docs.0g.ai/developer-hub/testnet/testnet-overview)
