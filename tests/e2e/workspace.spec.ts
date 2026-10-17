import { expect, test } from "@playwright/test";

test.describe("ImpactRelay fixture workspace", () => {
  test("lets a reviewer inspect and approve the mock checkpoint", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: "Flood support near Guwahati" })).toBeVisible();
    await expect(page.getByText("Payment checkpoint")).toBeVisible();

    await page.getByRole("button", { name: "Approve once" }).click();

    await expect(page.getByText("Approval recorded in Mock mode")).toBeVisible();
    await expect(page.getByText("No wallet signing or Testnet transaction is performed in this fixture.")).toBeVisible();
  });

  test("keeps the payment checkpoint readable on a narrow viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    await expect(page.getByText("Payment checkpoint")).toBeVisible();
    await expect(page.getByText("Stellar Testnet")).toBeVisible();

    const bodyWidth = await page.locator("body").evaluate((element) => element.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth);
  });
});
