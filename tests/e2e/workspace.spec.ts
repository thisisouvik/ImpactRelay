import { expect, test } from "@playwright/test";

test.describe("ImpactRelay real case workspace", () => {
  test("lets a reviewer create a case and inspect its stored plan", async ({ page }) => {
    await page.goto("/cases/new");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Turn a messy request into a reviewable plan." })).toBeVisible();
    await page.getByLabel("Case title").fill("E2E community support request");
    await page.getByLabel("Support request").fill("Find public resources near the affected area and prepare a reviewable checklist for a volunteer.");
    await page.getByRole("button", { name: /Save case and prepare plan/i }).click();

    await expect(page.getByRole("heading", { name: "Agent plan" })).toBeVisible();
    await expect(page.getByText("Case stored in local SQLite. The plan was generated from your request.")).toBeVisible();
    await expect(page.getByText("public · source · read")).not.toBeVisible();
    await expect(page.getByText("No source-backed evidence has been recorded for this case yet.")).toBeVisible();
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
