import { expect, test } from "@playwright/test";

test.describe("ImpactRelay real case workspace", () => {
  test("lets a reviewer create, reopen, and export a session-isolated case", async ({ page, browser }) => {
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Turn a messy request into a reviewable plan." })).toBeVisible();
    await page.getByLabel("Case title").fill("E2E community support request");
    await page.getByLabel("Support request").fill("Find public resources near the affected area and prepare a reviewable checklist for a volunteer.");
    const created = page.waitForResponse((response) => response.url().endsWith("/api/cases") && response.request().method() === "POST");
    const planned = page.waitForResponse((response) => response.url().endsWith("/api/agent/plan"));
    await page.getByRole("button", { name: /Save case and prepare plan/i }).click();
    expect((await created).status()).toBe(201);
    expect((await planned).status()).toBe(200);

    await expect(page.getByRole("heading", { name: "Agent plan" })).toBeVisible();
    await expect(page.getByText("Case saved. The plan was generated from your request.")).toBeVisible();
    await expect(page.getByText("public · source · read")).not.toBeVisible();
    await expect(page.getByText("No source-backed evidence has been recorded for this case yet.")).toBeVisible();

    const listed = await page.request.get("/api/cases");
    expect(listed.status()).toBe(200);
    const { cases } = await listed.json();
    expect(cases).toHaveLength(1);
    const id = cases[0].id as string;
    await page.goto(`/cases/${id}`);
    await expect(page.getByRole("heading", { name: "E2E community support request", exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Agent plan", exact: true })).toBeVisible();
    const exported = await page.request.get(`/api/cases/${id}/export`);
    expect(exported.status()).toBe(200);
    expect(await exported.json()).toMatchObject({ id, mode: "rules", status: "plan-ready" });

    const outsider = await browser.newContext();
    try {
      for (const path of [`/api/cases/${id}`, `/api/cases/${id}/export`]) {
        expect((await outsider.request.get(`http://127.0.0.1:3100${path}`)).status()).toBe(404);
      }
    } finally {
      await outsider.close();
    }
  });

  test("keeps the real case form readable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    await expect(page.getByLabel("Case title")).toBeVisible();
    await expect(page.getByLabel("Support request")).toBeVisible();

    const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });

  test("keeps the public and app pages within a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const path of ["/", "/workspace", "/cases", "/settings/integrations"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const widths = await page.locator("body").evaluate((element) => ({ body: element.scrollWidth, viewport: window.innerWidth }));
      expect(widths.body, `${path} has horizontal overflow`).toBeLessThanOrEqual(widths.viewport);
    }
  });
});
