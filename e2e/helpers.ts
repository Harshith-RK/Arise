import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Collects console errors and page errors for an assertion at the end. */
export function watchErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    // Next's dev overlay reports failed favicon fetches on some routes.
    if (text.includes("Failed to load resource") && text.includes("404")) return;
    errors.push(text);
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

/** Completes onboarding so the app has a Hunter. Idempotent. */
export async function awaken(page: Page) {
  await page.goto("/awaken");
  await page.waitForTimeout(200);
  if (page.url().includes("/app/")) return;
  // Sex and age are required: the plan model needs both.
  await page.getByRole("button", { name: "MALE", exact: true }).click();
  await page.getByLabel("AGE").fill("25");
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole("button", { name: "Accept the System" }).click();
  // The boot sequence plays after the profile is accepted. Tap through it.
  await page.waitForTimeout(300);
  await page.mouse.click(180, 200);
  await page.waitForURL("**/app/quest");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
