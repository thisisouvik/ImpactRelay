# Product and interface design

## Design direction: Signal Garden

ImpactRelay should feel like a calm operations desk that turns uncertainty into visible signals. The design language is called **Signal Garden**:

- **Field notes:** cases begin as imperfect human language, not sterile forms.
- **Signal paths:** every important fact has a visible origin and freshness.
- **Guardrails:** payment and side-effect boundaries are prominent, never hidden in a settings page.
- **Calm urgency:** the interface can communicate an urgent case without becoming a red-alert dashboard.
- **Human handoff:** the system makes it easy to pause, inspect, correct, approve, or export.

The visual goal is distinctive but credible: a reviewable field notebook combined with an instrument panel. Avoid the generic “dark AI chat with neon gradients” look.

## Visual identity

### Color roles

Use semantic roles rather than color names in components.

| Role | Direction | Usage |
| --- | --- | --- |
| `ink` | Deep blue-black | Main canvas, text, strong boundaries |
| `paper` | Warm off-white | Evidence cards, report surface, readable content |
| `signal` | Electric cyan | Active agent path, links, selected state |
| `field` | Soft green | Verified evidence, completed tool step |
| `amber` | Warm yellow | Needs review, proposed payment, stale data |
| `alert` | Coral red | Blocked, failed, unsafe, or expired state |
| `muted` | Slate gray | Secondary text, metadata, disabled controls |

The product must remain understandable in grayscale and for color-vision differences. Every state also has a label, icon, and text explanation.

### Typography

- Use the existing Geist family for interface text unless implementation finds a reproducible local-font issue.
- Use a mono face only for transaction IDs, tool names, timestamps, and structured values.
- Headings should be compact and editorial rather than oversized marketing text.
- Body text should stay between 15–18px on desktop and use generous line height.

### Shape and texture

- Medium-radius cards, not excessive pill-shaped containers.
- Thin ruled lines and dotted separators suggest a field notebook.
- One or two “signal markers” may appear as small circles along a timeline.
- Use shadows sparingly; prefer borders, contrast, and layering.
- Do not use motion or texture to disguise missing evidence.

## App shell

The main screen is a three-zone workspace on desktop:

```text
┌──────────────┬────────────────────────────────────────────┐
│ Case rail    │ Case header + budget + mode                 │
│              ├──────────────────────┬─────────────────────┤
│ New case     │ Evidence stream      │ Trust rail           │
│ Recent cases │ Agent activity       │ Sources               │
│ Export       │                      │ Payments              │
│ Settings     │                      │ Approvals             │
└──────────────┴──────────────────────┴─────────────────────┘
```

### Case rail

The left rail is a compact navigation and case switcher:

- Brand mark and `ImpactRelay` name.
- `New case` primary action.
- Recent case list with status markers.
- Mode indicator: `Rules`, `Local`, or `Grok`.
- Network indicator: `Offline` or `Stellar Testnet`.
- Export and safety links.

On small screens it becomes a top bar and a bottom sheet opened from the case switcher.

### Case header

The header answers four questions immediately:

1. What is this case about?
2. How urgent is it?
3. What may the agent spend?
4. Is a human currently needed?

It contains:

- Short case title.
- Location and language tags.
- Urgency label with explanation.
- Budget meter showing spent, reserved, and remaining.
- Mode and network badges.
- Pause/export controls.

### Evidence stream

The center is a vertical event stream, not a chat transcript. Each event is a compact card with:

- Time.
- Actor: `You`, `ImpactRelay`, `Free tool`, or `Paid service`.
- Action label.
- One-sentence result.
- Expandable technical detail.
- Evidence or receipt attachment.

The stream should make the agent’s behavior auditable without presenting hidden chain-of-thought. Show decisions, inputs, outputs, constraints, and citations—not private internal reasoning.

### Trust rail

The right rail stays focused on trust:

- Source freshness.
- Confidence summary.
- Conflicting evidence.
- Upcoming approval.
- Payment ledger.
- Final report readiness.

On small screens the trust rail becomes a tabbed drawer called `Review`.

## Signature interaction: the evidence constellation

The primary distinctive element is the **evidence constellation**. It is not a decorative graph. It is a compact relationship view showing:

- The user request at the center.
- Evidence nodes around it.
- Tool and payment nodes on the edges.
- Lines representing “supports,” “contradicts,” or “derived from.”

The first implementation may render this as a responsive CSS grid or ordered list. A graph library is not required for the MVP. The important behavior is that selecting a node highlights its source, freshness, and effect on the final recommendation.

Example labels:

```text
[User request]
      │
      ├── supports → [Open-Meteo: rainfall]
      ├── supports → [OSM: nearby shelter]
      ├── paid by  → [Stellar x402 receipt]
      └── qualifies → [Risk analysis result]
```

## Signature interaction: the payment checkpoint

Paid work appears as a deliberate checkpoint, not an automatic spinner:

```text
┌─────────────────────────────────────────────┐
│ PAYMENT CHECKPOINT                           │
│ Flood-risk analysis                          │
│                                             │
│ Why: free sources cannot estimate this risk │
│ Cost: $0.01 testnet USDC                    │
│ Network: Stellar Testnet                    │
│ Budget left: $0.04                          │
│                                             │
│ [Approve once] [Reject] [View policy]       │
└─────────────────────────────────────────────┘
```

If a pre-approved policy allows the call, the checkpoint still appears in the event stream with an `Auto-approved under policy` label.

## Core screens

### 1. Landing / new case

Purpose: orient the user and start a case quickly.

Elements:

- One plain-language prompt area.
- Example case chips that fill safe demo content.
- Mode selector with clear explanation.
- Network and budget settings.
- Privacy note: “Do not enter real sensitive personal data in this demo.”

### 2. Plan review

Purpose: show what the agent intends to do before it does it.

Elements:

- Objective summary.
- Ordered task cards.
- Free vs paid markers.
- Estimated cost and maximum cost.
- Risk notes.
- `Run free checks` and `Approve plan` actions.

### 3. Live case workspace

Purpose: follow execution without losing control.

Elements:

- Event stream.
- Stop/pause control.
- Budget meter.
- Approval checkpoint.
- Evidence constellation.
- Retry and inspect controls.

### 4. Final report

Purpose: make the result usable outside the app.

Sections:

- What we know.
- Recommended next actions.
- What is uncertain.
- Sources and timestamps.
- Payments and receipts.
- Human verification checklist.
- Export as Markdown or JSON.

## Interaction states

Every async operation must have explicit states:

| State | UI treatment | User action |
| --- | --- | --- |
| Draft | Editable, no execution | Edit or submit |
| Planning | Progress label and skeleton | Pause |
| Plan ready | Reviewable task cards | Approve or edit |
| Awaiting payment | Checkpoint with amount and reason | Approve or reject |
| Paying | Non-dismissible transaction progress | Wait or cancel if safe |
| Evidence ready | Source and freshness details | Inspect |
| Needs review | Amber rail and blocking explanation | Correct or approve |
| Completed | Report and export actions | Share/export |
| Failed | Cause, safe retry, and preserved history | Retry or end case |
| Expired | Stale quote or testnet reset warning | Refresh or restart |

## Accessibility requirements

- Keyboard navigation for every action and approval.
- Visible focus styles.
- Minimum WCAG AA contrast for text and controls.
- No information conveyed by color alone.
- `aria-live` status region for agent events and payment state changes.
- Reduced-motion mode disables constellation animation and timeline pulses.
- Form labels and error messages remain visible after submission.
- The case report is readable without opening a side panel.
- Long transaction IDs have copy buttons and accessible full-text labels.

## Responsive behavior

### Desktop: 1200px and above

Three-zone workspace with persistent trust rail.

### Tablet: 768–1199px

Two-column workspace. Trust rail becomes a collapsible review panel.

### Mobile: below 768px

Single-column flow:

1. Case header.
2. Current action/approval.
3. Evidence stream.
4. Review drawer.

Do not hide the payment amount or network label on mobile.

## Copy and tone

The voice is practical, respectful, and explicit:

- Prefer “The source is 3 hours old” over “Confidence may be impacted.”
- Prefer “The agent wants to spend $0.01” over “Executing paid tool.”
- Prefer “Human verification needed” over “AI cannot guarantee.”
- Never imply that a generated recommendation is an official emergency instruction.

## Design definition of done

The implementation is visually ready when:

- A first-time user can create a demo case without instructions.
- The plan, payment checkpoint, evidence, and final report are visually distinct.
- A reviewer can trace a recommendation to a source and a payment receipt.
- All critical states have text, not only color or animation.
- The layout works at mobile width without horizontal scrolling.
- Rules mode looks like a real product, not a test fixture, and requires real user input.
