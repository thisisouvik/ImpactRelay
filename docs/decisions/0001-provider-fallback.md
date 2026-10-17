# ADR 0001: Provider abstraction with local and mock fallback

- **Status:** Accepted for MVP
- **Date:** 2026-10-17

## Context

The product should use Grok for a strong hackathon demonstration, but API availability, quotas, and credits may change. A student project cannot depend on a paid provider for local development, tests, or judging fallback.

## Decision

Define a provider-neutral `LlmProvider` interface with three implementations:

1. Grok API provider.
2. Local open-source model provider.
3. Deterministic mock provider.

Provider selection is server-side and recorded in the case event history.

## Consequences

### Positive

- Development works without paid credits.
- Tests are deterministic and offline.
- Provider failures do not destroy the product demo.
- The domain model remains portable.

### Negative

- Structured output behavior must be tested across providers.
- Prompt and capability differences require adapter-specific instructions.
- A local model may produce lower-quality plans than Grok.

## Rejected alternatives

- Hard-coding Grok calls into route handlers: too difficult to test and replace.
- Building a model into the repository: too large and hardware-dependent.
- Using a second paid provider as the only fallback: violates the free/open-source requirement.
