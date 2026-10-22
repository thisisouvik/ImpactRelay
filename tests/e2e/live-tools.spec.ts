import { expect, test } from "@playwright/test";

test("runs real location/weather tools and persists a source-backed Rules brief", async ({ page }) => {
  test.skip(process.env.IMPACTRELAY_LIVE_TOOLS !== "1", "Opt in explicitly: this test contacts public internet services.");
  test.setTimeout(90_000);
  await page.goto("/cases/new");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Case title").fill("Live weather verification");
  await page.getByLabel("Support request").fill("Check current weather near Guwahati and prepare a reviewable checklist.");
  const created = page.waitForResponse((response) => response.url().endsWith("/api/cases") && response.request().method() === "POST");
  const planned = page.waitForResponse((response) => response.url().endsWith("/api/agent/plan"));
  await page.getByRole("button", { name: /Save case and prepare plan/i }).click();
  expect((await created).status()).toBe(201);
  expect((await planned).status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Agent plan", exact: true })).toBeVisible();

  const completed = page.waitForResponse((response) => response.url().endsWith("/api/agent/run"), { timeout: 60_000 });
  await page.getByRole("button", { name: /Run available steps/i }).click();
  const response = await completed;
  expect(response.status()).toBe(200);
  const payload = await response.json();
  expect(payload.case.status).toBe("report-ready");
  expect(payload.case.report.providerId).toBe("rules");
  expect(payload.case.evidence).toHaveLength(2);
  expect(payload.case.evidence.map((item: { sourceName: string }) => item.sourceName)).toEqual(
    expect.arrayContaining(["OpenStreetMap Nominatim", "Open-Meteo"]),
  );
  for (const item of payload.case.evidence) {
    expect(item.freshness).toBe("live");
    expect(item.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(item.sourceUrl).toMatch(/^https:\/\//);
  }
  await expect(page.getByRole("heading", { name: "Action brief", exact: true })).toBeVisible();
  await page.goto(`/cases/${payload.case.id}`);
  await expect(page.getByRole("heading", { name: "Action brief", exact: true })).toBeVisible();
  const exported = await page.request.get(`/api/cases/${payload.case.id}/export`);
  expect(exported.status()).toBe(200);
  expect(await exported.json()).toMatchObject({ status: "report-ready", report: { providerId: "rules" } });
});
