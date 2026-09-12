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
  await page.mouse.click(180, 200); // skip the boot sequence
  if (page.url().includes("/app/")) return;
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(200);
  }
  await page.getByRole("button", { name: "Accept the System" }).click();
  await page.waitForURL("**/app/quest");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
