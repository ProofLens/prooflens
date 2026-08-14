import { expect, test, type Page } from "@playwright/test";
import { startHarness, type HarnessAssets } from "./harness.js";

test.describe.configure({ timeout: 120000 });

let harness: HarnessAssets;

test.beforeAll(async () => {
  harness = await startHarness();
});

test.afterAll(async () => {
  await harness.close();
});

async function fulfillRegistry(page: Page): Promise<void> {
  await page.route("https://registry.example.test/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(harness.record)
    });
  });
}

async function waitForLive(page: Page, proof: string): Promise<void> {
  await expect(page.locator(".prooflens-live")).toContainText(proof, { timeout: 30000 });
  await expect(page.locator(".prooflens-live")).toContainText("does not authenticate the human creator");
}

test("keyboard, focus, and live region keep ProofLens and C2PA separate", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/react/trusted`);
  await waitForLive(page, "ProofLens: Trusted");
  const button = page.locator("button.prooflens-status");
  await expect(button).toHaveAttribute("data-prooflens-state", "trusted");
  await expect(button).toHaveAttribute("data-c2pa-state", "absent");
  await page.locator("body").click({ position: { x: 1, y: 1 } });
  await page.keyboard.press("Tab");
  await expect(button).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  const details = page.locator(".prooflens-details");
  await expect(details).toBeVisible();
  await expect(details).toContainText("C2PA:");
  await expect(details).not.toContainText("human creator is C2PA-authenticated");
  await page.keyboard.press("Escape");
  await expect(button).toHaveAttribute("aria-expanded", "false");
  await expect(button).toBeFocused();
});

test("unavailable registry never produces trusted", async ({ page }) => {
  await page.goto(`${harness.origin}/react/unavailable-registry`);
  await waitForLive(page, "ProofLens: Valid (untrusted identity)");
  await expect(page.locator("button.prooflens-status")).toHaveAttribute("data-prooflens-state", "valid-untrusted");
});

test("currentSrc is hashed instead of src", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/react/current-src`);
  await waitForLive(page, "ProofLens: Trusted");
  const currentSrc = await page.locator("img").evaluate((img: HTMLImageElement) => img.currentSrc);
  expect(currentSrc).toContain("/assets/right.jpg");
});

test("CORS failure is an invalid error state, not a crash", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/react/cors`);
  await waitForLive(page, "ProofLens: Invalid");
  await expect(page.locator(".prooflens-live")).toContainText(/CORS|could not be read|failed to load/i);
  await expect(page.locator("button.prooflens-status")).toHaveAttribute("data-prooflens-state", "invalid");
});

test("offline verification does not crash and does not report trusted", async ({ page }) => {
  await page.goto(`${harness.origin}/react/offline`);
  await page.locator("img").waitFor();
  await page.getByRole("button", { name: "Verify offline" }).click();
  await expect(page.locator("button.prooflens-status")).not.toHaveAttribute("data-prooflens-state", "trusted", { timeout: 30000 });
  await expect(page.locator(".prooflens-live")).toContainText("does not authenticate the human creator");
});

test("conflicting claims are invalid and not merged", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/react/conflict`);
  await waitForLive(page, "ProofLens: Invalid");
  await page.locator("button.prooflens-status").click();
  await expect(page.locator(".prooflens-details")).toContainText(/conflict/i);
});

test("auto-attach reports conflicts as invalid", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/attach/conflict`);
  await waitForLive(page, "ProofLens: Invalid");
  await expect(page.locator(".prooflens-live")).toContainText(/conflict/i);
});

test("auto-attach hashes currentSrc", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/attach/current-src`);
  await waitForLive(page, "ProofLens: Trusted");
});

test("auto-attach CORS is invalid and does not crash", async ({ page }) => {
  await fulfillRegistry(page);
  await page.goto(`${harness.origin}/attach/cors`);
  await waitForLive(page, "ProofLens: Invalid");
});

test("browser signing is limited to the ProofLens creator identity layer", async ({ page }) => {
  await page.goto(`${harness.origin}/react/browser-sign`);
  await page.getByRole("button", { name: "Sign in browser" }).click();
  await expect(page.locator("#sign-status")).toContainText("C2PA signing is not available in the browser", { timeout: 30000 });
});
