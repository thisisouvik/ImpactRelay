# ImpactRelay documentation

## Purpose

This directory is the source of truth for the product definition and the implementation constraints that must be agreed before application code is written.

## Reading order

| Order | Document | What it decides |
| --- | --- | --- |
| 1 | [idea.md](idea.md) | Who the product serves, what it does, and what the MVP proves |
| 2 | [design.md](design.md) | How the product should feel and how the main case flow behaves |
| 3 | [technical architecture.md](technical%20architecture.md) | System boundaries, data flow, integrations, and folder ownership |
| 4 | [implementation.md](implementation.md) | Build phases, task order, acceptance criteria, and definition of done |
| 5 | [deployment.md](deployment.md) | Reproducible local deployment, optional free hosting, and testnet operations |
| 6 | [security.md](security.md) | Secret handling, payment controls, privacy, and agent safety |
| 7 | [testing.md](testing.md) | Offline tests, integration tests, and demo verification |
| 8 | [decisions/](decisions/) | Decisions that should remain explicit as the project evolves |

## Documentation rules

- Documentation describes intended behavior; it must not claim that an integration works until a check proves it.
- Every external service must have a local/mock alternative or an explicit reason why it cannot.
- Every payment path must identify its network, asset, maximum amount, failure behavior, and approval boundary.
- Every agent action must identify whether it is read-only, paid, side-effecting, or human-approved.
- Secrets, private keys, real personal data, and private logs never belong in this directory or in Git.
- When implementation changes a documented decision, update the relevant document and add an ADR when the change affects system boundaries.

## Current phase

**Phase 0 — product and architecture definition.** The repository contains a Next.js boilerplate plus the planned empty directories. The next coding step is to implement the smallest vertical slice described in [implementation.md](implementation.md), not to build every future integration at once.

## Baseline checks

- `npm run lint` — passes.
- `npx --no-install tsc --noEmit --incremental false` — passes.
- `npm run build` — currently fails because the starter `next/font/google` imports need to fetch Geist from Google Fonts. This is a known reproducibility gap to fix before the first deployment; it is not caused by the documentation changes.

## External references

- [xAI API overview](https://docs.x.ai/docs/overview)
- [x402 documentation](https://docs.x402.org/)
- [Official Stellar x402 repository](https://github.com/stellar/x402-stellar)
- [Stellar networks](https://developers.stellar.org/docs/networks.md)
- [Stellar RPC](https://developers.stellar.org/docs/data/apis/rpc.md)
