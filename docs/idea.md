# Product idea: ImpactRelay

## One-sentence pitch

**ImpactRelay is a trustworthy AI caseworker that turns a messy community-support request into a verified, localized, and executable action plan—buying only the extra information it needs through bounded Stellar x402 micropayments.**

## The problem

Volunteers and small organizations often have the motivation to help but not the time or tools to assemble reliable information. A single request can require:

- Interpreting an informal message.
- Identifying a location and urgency.
- Checking several public sources.
- Finding nearby resources.
- Translating instructions.
- Calling a specialist service.
- Explaining what is known, what is stale, and what still needs verification.

Generic chatbots produce fluent answers but commonly hide the source trail, uncertainty, and cost of the services used. Traditional workflows are too slow for a small volunteer team.

## Target users

### Primary user: community volunteer

The volunteer has a phone or laptop, limited time, and a concrete case to resolve. They need a next step, not an essay.

### Secondary user: small NGO or mutual-aid coordinator

The coordinator needs repeatable case records, clear responsibility, and a way to explain how a recommendation was produced.

### Service provider: specialist tool operator

A specialist can publish a small API—risk scoring, translation, document extraction, route analysis—and charge per request without building a full account or subscription system.

## The first use case

The initial vertical is **community assistance during a local disruption**, demonstrated with a flood-support case. The user asks for help locating resources and preparing a bilingual action checklist.

Example request:

> “Three families near Guwahati were affected by flooding. Find nearby shelters, check current weather risk, identify useful relief-program information, and make a checklist in Assamese and English.”

The agent must return:

- A concise situation summary.
- A prioritized action list.
- Evidence cards with source URLs and retrieval times.
- Confidence and freshness indicators.
- Unresolved questions and human verification requests.
- A ledger of every tool call and payment.

## Why x402 belongs in this product

x402 makes a specialist service available at the moment it is needed without requiring the volunteer to create another account or manage another API key. The agent can:

1. Request a service.
2. Receive `402 Payment Required`.
3. Check the requested amount against the case budget.
4. Ask the user for approval when policy requires it.
5. Sign and settle a small Stellar Testnet payment.
6. Retry the request with the payment proof.
7. Attach the settlement receipt to the evidence record.

This is a real machine-to-machine payment use case, not a wallet badge added to a chatbot.

## Product principles

1. **Evidence before confidence.** An answer without a source or a clearly marked inference is incomplete.
2. **Bounded autonomy.** The model can propose; policy code decides what may execute.
3. **Pay only for marginal value.** Free sources are used first. Paid calls must have a reason, price, and budget check.
4. **Human judgment at the edge.** The product supports people; it does not pretend to replace local knowledge or emergency authorities.
5. **Free to build.** Grok is optional, transparent rules planning works locally, and real providers can be added without making paid credits a requirement for case creation.
6. **Portable records.** A case can be exported as JSON/Markdown instead of being trapped in a hosted service.

## MVP promise

In a five-minute demo, a reviewer can submit one case, inspect the plan, approve one testnet payment, watch the agent gather evidence, and read a final action plan with a verifiable Stellar transaction receipt.

## MVP boundaries

### In scope

- One case at a time.
- One focused community-assistance scenario.
- Rules planner with Grok and local provider adapters added behind explicit configuration.
- Free location, weather, and public-information tools.
- One x402-protected specialist service.
- Stellar Testnet only.
- A small budget and explicit approval UI.
- Evidence, confidence, and receipt timeline.
- Offline unit and integration tests.

### Out of scope

- Mainnet payments.
- Custody of user funds.
- Automatic emergency dispatch.
- Medical, legal, immigration, or financial eligibility decisions.
- Sending messages or making applications without human approval.
- A public multi-tenant marketplace.
- Long-term storage of sensitive personal information.

## What makes the idea distinctive

The differentiator is the combination of **casework + evidence + bounded spending + payment provenance**. A generic agent demonstrates tool calls. ImpactRelay demonstrates a responsible workflow that a small organization could understand, audit, and operate.

## Success signals for the hackathon

- A reviewer understands the user problem within 30 seconds.
- The full payment flow is visible and reproducible on Stellar Testnet.
- The agent never exceeds its configured spend cap.
- The final report clearly distinguishes source facts, model synthesis, and uncertainty.
- The same case workflow runs in Rules mode without credentials and uses real provider/tool results when those integrations are configured.
- A new developer can run the project from the repository instructions without paid infrastructure.
