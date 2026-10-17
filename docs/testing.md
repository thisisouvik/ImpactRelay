# Testing strategy

## Testing principles

1. Rules mode must test the case workflow without the network.
2. Paid paths must be tested with a fake facilitator before Testnet.
3. Real Testnet checks are smoke tests, not the only proof of correctness.
4. Tests should verify user-visible safety properties, not hidden model reasoning.
5. Every provider and repository must satisfy a shared contract.

## Test layers

### Unit tests

Test pure functions and policies:

- Case input validation.
- Plan validation.
- State transitions.
- Budget reservation and release.
- Decimal/atomic amount comparisons.
- Tool allow-list checks.
- Approval requirements.
- Evidence freshness and confidence classification.
- Redaction.
- Transaction explorer URL construction.

Unit tests must be deterministic and offline.

### Provider contract tests

Run the same contract suite against:

- Rules planner.
- `LocalProvider` with a stub HTTP server.
- `GrokProvider` with a stubbed xAI response.

Cover:

- Valid structured output.
- Invalid structured output.
- Timeout.
- Rate limit.
- Empty output.
- Provider fallback.

No test should require a live Grok key by default.

### Tool adapter tests

Use recorded or generated fixtures for:

- Location success and ambiguous location.
- Weather success and stale response.
- Public source timeout and oversized response.
- Paid service `402` response.
- Paid service success after payment.
- Paid service malformed output.

Verify that every successful adapter result contains provenance metadata.

### Payment tests

Use a fake x402 facilitator and fake Stellar signer first:

1. Receive a payment requirement.
2. Validate network, asset, amount, and recipient.
3. Require approval.
4. Create a payment payload.
5. Verify and settle through the fake facilitator.
6. Retry the request.
7. Persist the receipt.

Negative cases:

- Unsupported network.
- Unsupported asset.
- Amount above cap.
- Case budget exceeded.
- Expired quote.
- Reused payment intent.
- Facilitator verification failure.
- Settlement failure.
- Retry after already-settled intent.

### Route-handler integration tests

Test the HTTP contract for:

- `POST /api/cases`.
- `POST /api/agent/plan`.
- `POST /api/agent/run`.
- `POST /api/agent/approve`.
- `POST /api/agent/pause`.
- `GET /api/cases/[id]`.
- `GET /api/payments/[id]`.
- `GET /api/health`.

Check status codes, stable error shapes, authorization/approval boundaries, and redacted responses.

### Browser acceptance tests

Once the UI exists, automate or manually rehearse:

- Create a case from an example prompt.
- Review a plan.
- Reject a payment.
- Approve a payment.
- Observe the event stream.
- Inspect evidence.
- Read the final report.
- Export the report.
- Use the same flow on a narrow viewport.
- Turn on reduced motion.

The browser test should create a real case in Rules mode by default and verify the safe blocked boundary before external adapters are configured.

### Real Testnet smoke test

This is opt-in and never part of the offline test command. It requires:

- A disposable Stellar Testnet wallet.
- Testnet funding.
- A configured facilitator or local facilitator.
- A known paid service.

The smoke test must:

- Use a tiny amount.
- Confirm the network identifier.
- Wait for and verify settlement.
- Record the transaction ID in local output only.
- Clean up or rotate the disposable key when necessary.

## Test-only fixtures

Fixtures should include:

- A flood-support case with no personal names.
- Weather data with timestamps.
- A shelter/location result.
- A paid risk response.
- A valid x402 payment requirement.
- A successful settlement receipt.
- An expired quote.
- Conflicting evidence.

Test fixtures must contain fake keys and fake transaction IDs that cannot be mistaken for real credentials. They must remain under `tests/` and must never be imported by runtime application code.

## Required commands after implementation

The project should converge on:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` must not make network calls. A separate opt-in command may be added for Testnet smoke testing, for example:

```bash
npm run test:testnet
```

Never make the default test command spend testnet assets.

## Definition of done for a feature

- Happy path is covered.
- Important boundary/failure cases are covered.
- Tests run without credentials unless explicitly marked as live.
- User-visible error behavior is checked.
- Documentation names any external prerequisite.
- The smallest meaningful test has been run and its result recorded.
