# ImpactRelay documentation

## Purpose

This directory is the source of truth for the product definition and the implementation constraints that must be agreed before application code is written.

## Reading order

| Order | Document | What it decides |
| --- | --- | --- |
| 1 | [idea.md](idea.md) | Who the product serves, what it does, and what the MVP proves |
| 2 | [design.md](design.md) | How the product should feel and how the main case flow behaves |
| 3 | [technical architecture.md](technical%20architecture.md) | System boundaries, data flow, integrations, and folder ownership |
| 4 | [implementation.md](implementation.md) | Build phases, acceptance criteria, and definition of done |
| 5 | [deployment.md](deployment.md) | Reproducible local deployment, optional free hosting, and testnet operations |
| 6 | [0g-implementation.md](0g-implementation.md) | Current 0G Compute boundary, free demo path, and next integration steps |
| 7 | [security.md](security.md) | Secret handling, payment controls, privacy, and agent safety |
| 8 | [testing.md](testing.md) | Offline tests, integration tests, and demo verification |
| 9 | [decisions/](decisions/) | Decisions that should remain explicit as the project evolves |

The current recording checklist is in [demo-runbook.md](demo-runbook.md).
The environment and free-credential guide is in [env-credentials.md](env-credentials.md).
The normal-user manual test checklist is in [manual-testing-guide.md](manual-testing-guide.md).

## Documentation rules

- Documentation describes intended behavior; it must not claim that an integration works until a check proves it.
- Every external service must have a local/mock alternative or an explicit reason why it cannot.
- Every payment path must identify its network, asset, maximum amount, failure behavior, and approval boundary.
- Every agent action must identify whether it is read-only, paid, side-effecting, or human-approved.
- Secrets, private keys, real personal data, and private logs never belong in this directory or in Git.
- When implementation changes a documented decision, update the relevant document and add an ADR when the change affects system boundaries.

## Current phase

**Evidence-first agent demo — real free tools, transparent Rules reports, and optional Groq/0G providers.** The repository contains a real user-input case workflow, SQLite/Neon persistence, location/weather/public-source adapters, nearby resource discovery, server-only provider guardrails, and a no-credential demo path. See [0g-implementation.md](0g-implementation.md) for the current 0G boundary.

## Baseline checks

- `npm run lint` — passes.
- `npx --no-install tsc --noEmit --incremental false` — passes.
- `npm run build` — passes with the local/system font strategy and the current dynamic API routes.

## External references

- [Groq API documentation](https://console.groq.com/docs)
- [x402 documentation](https://docs.x402.org/)
- [Official Stellar x402 repository](https://github.com/stellar/x402-stellar)
- [Stellar networks](https://developers.stellar.org/docs/networks.md)
- [Stellar RPC](https://developers.stellar.org/docs/data/apis/rpc.md)
