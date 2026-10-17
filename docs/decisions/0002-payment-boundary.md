# ADR 0002: Server-side bounded x402 payments on Stellar Testnet

- **Status:** Accepted for MVP
- **Date:** 2026-10-17

## Context

ImpactRelay needs a meaningful reason to use x402. The agent should be able to acquire specialist information per request, but it must not expose wallet secrets or make uncontrolled payments. The hackathon scope requires a free testnet environment.

## Decision

The Next.js server acts as the x402 buyer for a dedicated, disposable Stellar Testnet signer. The browser never signs the payment in the MVP. Every paid request passes through a policy engine that checks:

- Network.
- Asset.
- Tool allow-list.
- Per-call cap.
- Case cap.
- Quote freshness.
- Approval state.
- Idempotency state.

The first payment requires explicit human approval. Testnet settlement is recorded as a receipt only after server-side/facilitator confirmation.

## Consequences

### Positive

- The demo has a clear HTTP 402 → pay → retry story.
- Wallet secrets remain server-side.
- The UI can show a transparent approval checkpoint.
- Mainnet cannot be reached through the MVP path.

### Negative

- The server holds a signing capability, even if only for Testnet.
- The flow requires careful replay and failure handling.
- Testnet resets and external facilitator availability can affect a live demo.

## Rejected alternatives

- Letting the model directly sign transactions: unsafe and impossible to audit reliably.
- Calling Mainnet: outside student/hackathon scope.
- Adding a wallet button without a paid service: does not demonstrate x402 utility.
