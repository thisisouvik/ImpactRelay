# ImpactRelay manual testing guide

This is the normal-user checklist for testing ImpactRelay before a hosted demo. It covers the no-credential Rules flow first, then optional provider and hosted checks.

## 1. Test prerequisites

For the safest local test, you need:

- Node.js `22.14.0` from `.nvmrc`.
- npm `11.x`.
- A clean checkout with `package-lock.json`.
- Internet access for the live public-data adapters.
- No API keys for the Rules flow.

Install and start:

```bash
npm ci
cp .env.example .env.local
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env.local` instead of `cp`.

Open `http://localhost:3000`. The local default uses SQLite at `data/impactrelay.sqlite`; this file is ignored by Git.

## 2. Test the landing page

1. Open `/`.
2. Confirm the ImpactRelay logo, product description, and primary CTA are visible.
3. Scroll through the full page and confirm hero, orbit, card, and page animations are visible.
4. Confirm animation does not prevent reading or clicking content.
5. Click **Create a case** and confirm navigation reaches `/cases/new`.
6. Resize the browser to approximately `390 × 844`.
7. Confirm there is no horizontal scrollbar or clipped primary action.

Expected result: the landing page is readable, animated, keyboard-accessible, and usable on mobile.

## 3. Create a normal-user case

Use fictional or redacted information. Do not enter real names, exact home addresses, health information, private phone numbers, or credentials.

1. Open `/cases/new`.
2. Enter the title `Volunteer resource review`.
3. Enter this request:

   ```text
   Find nearby shelters and public guidance near Guwahati after heavy rain. Check the current weather and prepare a reviewable checklist for a volunteer. Do not claim that any resource is open or has capacity unless a source proves it.
   ```

4. Keep **Rules planner** selected.
5. Click **Save case and prepare plan**.

Expected result:

- The request is saved.
- The browser receives an HttpOnly session cookie.
- The case detail view appears.
- The case has a stored plan with bounded read-only steps.
- No fabricated evidence is shown.

## 4. Inspect the plan and audit trail

Confirm that the case page shows:

- The original request.
- The case title and selected mode.
- An explicit plan objective.
- Tool IDs and purposes for each step.
- Free/read-only status for free steps.
- Case-received and plan-ready lifecycle events.
- No synthetic payment or receipt.

For a location/weather/resource request, expect some combination of:

```text
location.lookup
resources.nearby
weather.current
public.source.read
```

## 5. Run live free tools

1. Click **Run available steps**.
2. Wait for execution to finish.
3. Review the event trail.
4. Inspect Evidence.

Successful evidence should include source name, URL, retrieval timestamp, freshness, confidence, content hash, and adapter metadata.

Expected live sources are OpenStreetMap Nominatim, Open-Meteo, and optionally OpenStreetMap Overpass. Public services can rate-limit or fail. If Overpass fails, the correct result is a visible failed tool and a partial brief; the app must not invent locations, opening hours, capacity, or safety claims.

## 6. Review the transparent action brief

When at least one valid evidence result exists, the case should reach `report-ready`.

Confirm the brief separates:

- **What we know** — source-backed facts.
- **Recommended next actions** — human verification steps, not facts.
- **Still uncertain** — missing or unverified information.

For nearby resources, confirm the UI says availability was not verified.

## 7. Check persistence and session isolation

1. Copy the case URL.
2. Refresh the page.
3. Open `/cases` and confirm the case appears.
4. Reopen the case from the list.
5. Open a private/incognito browser window.
6. Paste the copied case URL there.

Expected result: the original browser session can reopen/export the case, while the private window cannot read it without the original session cookie. This is anonymous session isolation, not full user authentication.

## 8. Test export

1. Return to the original browser session.
2. Open the case and click **Export**.
3. Confirm a JSON download.
4. Confirm it contains the case, plan, events, evidence, and report when available.

Do not upload an export containing sensitive data to a public repository or video.

## 9. Test Cases and Workspace pages

For `/cases`:

1. Confirm saved cases load from the API, not a hardcoded example.
2. Click a case card and confirm it opens the matching detail route.
3. Resize to `390 × 844` and check for horizontal overflow.

For `/workspace`:

1. Confirm counts reflect persisted cases and evidence.
2. Confirm recent records link to real cases.
3. Confirm the empty state appears only when the session has no cases.
4. Check the page at `390 × 844`.

## 10. Test Integrations status

1. Open `/settings/integrations`.
2. Confirm it reports persistence, planner, provider, Redis, and cache status.
3. Confirm no secret value is shown.
4. Click **Refresh**.

With local Rules mode, Grok, 0G, Neon, and Redis may correctly show as unconfigured.

## 11. Optional Grok test

Only run this with a valid xAI key, model access, and available quota:

```env
APP_MODE=grok
XAI_API_KEY=your-key
XAI_MODEL=grok-4.7
XAI_BASE_URL=https://api.x.ai/v1
```

Restart the server, create a new case, select Grok, and repeat planning and execution. Confirm structured plans/reports, tool allow-listing, evidence-ID validation, and visible provider failures. The app must not silently switch providers.

## 12. Optional 0G test

Only run this with a funded 0G Router account and supported model:

```env
APP_MODE=0g
OG_COMPUTE_API_KEY=sk-your-key
OG_COMPUTE_BASE_URL=https://router-api.0g.ai/v1
OG_COMPUTE_MODEL=your-supported-model
OG_COMPUTE_TRUST_MODE=private
```

Confirm the key is not visible in the browser, private trust routing is requested, unsupported models fail visibly, and evidence still comes only from real tools.

## 13. Hosted deployment smoke test

Configure the host with:

```env
APP_MODE=rules
NEXT_PUBLIC_APP_URL=https://your-deployed-domain.example
DATABASE_URL=your-neon-connection-string
UPSTASH_REDIS_REST_URL=your-upstash-rest-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-rest-token
RATE_LIMIT_MODE=required
REDIS_CACHE_PREFIX=impactrelay
```

Then verify:

1. `GET /api/health` is healthy.
2. `/`, `/cases/new`, `/cases`, `/workspace`, and `/settings/integrations` load.
3. A real case can be created, planned, run, reopened, and exported.
4. A second browser session cannot read the first session's case.
5. The browser console contains no API key or database connection string.

Do not deploy production with empty `DATABASE_URL` or empty Upstash credentials. Production rejects those fallbacks.

## 14. Automated checks

```bash
npm run lint
npm run typecheck
npm test -- --run
npm run build
npm run test:e2e
```

Or run the offline production gate:

```bash
npm run check
```

## 15. Manual test record

| Check | Result | Notes |
| --- | --- | --- |
| Landing page | ☐ Pass / ☐ Fail | |
| Mobile landing | ☐ Pass / ☐ Fail | |
| New case creation | ☐ Pass / ☐ Fail | |
| Plan generation | ☐ Pass / ☐ Fail | |
| Live location tool | ☐ Pass / ☐ Fail | |
| Live weather tool | ☐ Pass / ☐ Fail | |
| Nearby resource tool | ☐ Pass / ☐ Fail / ☐ Service unavailable | |
| Evidence provenance | ☐ Pass / ☐ Fail | |
| Transparent action brief | ☐ Pass / ☐ Fail | |
| Case persistence | ☐ Pass / ☐ Fail | |
| Session isolation | ☐ Pass / ☐ Fail | |
| JSON export | ☐ Pass / ☐ Fail | |
| Mobile cases page | ☐ Pass / ☐ Fail | |
| Integrations status | ☐ Pass / ☐ Fail | |
| Hosted health endpoint | ☐ Pass / ☐ Fail / ☐ Not deployed | |
| Grok provider | ☐ Pass / ☐ Fail / ☐ Not configured | |
| 0G provider | ☐ Pass / ☐ Fail / ☐ Not configured | |
