# ImpactRelay demo runbook

## Goal

Show a real case moving from an uncertain community request to a bounded plan, live public-data checks, an evidence record, and a transparent action brief.

The primary recording path uses **Rules mode** and needs no paid model, wallet, hosted database, or API key. Groq and 0G are optional enhancements, not dependencies for the demo.

## Local rehearsal

Use Node 22.14.0 from `.nvmrc`:

```bash
npm ci
npm run dev
```

Open:

```text
http://localhost:3000/cases/new
```

## Recommended case prompt

Use fictional or redacted information:

```text
Find nearby shelters, hospitals, food, and public water resources near Guwahati after heavy rain. Check the current weather and prepare a reviewable checklist for a volunteer. Do not claim that any resource is open or has capacity unless a source proves it.
```

## Recording sequence

1. Open the landing page and show the ImpactRelay mark and the evidence-first positioning.
2. Select **Create a case**.
3. Enter the case title:

   ```text
   Guwahati volunteer response brief
   ```

4. Paste the recommended prompt.
5. Keep **Rules planner** selected to demonstrate the no-credential path.
6. Click **Save case and prepare plan**.
7. Point out the bounded plan and its read-only steps:
   - location resolution;
   - nearby resource discovery;
   - weather context.
8. Click **Run available steps**.
9. Explain that the agent calls real public services:
   - OpenStreetMap Nominatim;
   - OpenStreetMap Overpass;
   - Open-Meteo.
10. Show the event trail and evidence cards.
11. Point out the resource boundary:

    ```text
    availability not verified
    ```

12. Show the **Transparent evidence brief**:
    - known source-backed facts;
    - a human verification action;
    - explicit uncertainty;
    - no model claim and no fabricated resource status.
13. Open **Integrations** to show that 0G Compute can be enabled as a server-side private/decentralized provider without changing the evidence boundary, and that secrets are not displayed in the browser.

## Optional Groq recording

Only use this path when the account has valid credits or a free quota. Do not put the key in the browser or commit it.

```env
APP_MODE=groq
GROQ_API_KEY=your-server-side-key
GROQ_MODEL=openai/gpt-oss-20b
```

Restart the server after changing environment variables. Select **Groq** in the new-case form. The plan and report remain constrained by the same tool allow-list and evidence-ID validation.

Do not describe the Groq account or model as universally free. Availability depends on the account, model, and current provider terms.

## Optional 0G recording

Use only a server-side 0G Router key from `pc.0g.ai` and a model visible in the current 0G model catalog:

```env
APP_MODE=0g
OG_COMPUTE_API_KEY=sk-...
OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
OG_COMPUTE_MODEL=your-supported-model
OG_COMPUTE_TRUST_MODE=private
```

Before recording, confirm that the selected model supports JSON mode and that a TeeML provider is available if `private` mode is enabled. If private capacity is unavailable, ImpactRelay should display the failure rather than silently downgrade.

## Hosted deployment checklist

For a free hosted demo:

1. Deploy the repository to a Node-compatible host such as Vercel.
2. Set the Node version to `22.14.0` if the host supports a version setting.
3. Use `npm run build` as the build command.
4. Add `DATABASE_URL` for durable hosted persistence. Do not rely on SQLite for a public serverless deployment.
5. Add Upstash Redis values and set `RATE_LIMIT_MODE=required` for a public deployment.
6. Add only the provider keys you intend to use.
7. Leave `APP_MODE=rules` for the most reliable no-key public demo, or configure Groq/0G server-side.
8. Verify `/api/health`, `/cases/new`, case creation, and one full run before recording.
9. Share the deployment URL only after checking that no secrets appear in the browser or page source.

## Fallback if public services are unavailable

Keep a local rules-mode recording or show the plan and visible blocked state. Never replace live source results with invented data, sample evidence, or fake receipts.
