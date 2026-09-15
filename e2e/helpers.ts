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
  const next = async () => {
    await page.getByRole("button", { name: "Next", exact: true }).click();
    await page.waitForTimeout(200);
  };

  // Onboarding starts empty, so every answer that shapes the plan is filled in.
  // These match the profile the suite was written against.
  await page.getByLabel("HUNTER NAME").fill("Test Hunter");
  await page.getByRole("button", { name: "MALE", exact: true }).click();
  await page.getByLabel("AGE").fill("25");
  await page.getByLabel("HEIGHT").fill("175.5");
  await page.getByLabel("CURRENT WEIGHT").fill("95.5");
  await page.getByLabel("TARGET WEIGHT").fill("72.7");
  await next();
  await page.getByLabel("BODY FAT").fill("35.3");
  await next();
  await page.getByLabel("GYM FROM").fill("19:00");
  await page.getByLabel("GYM UNTIL").fill("21:00");
  await page.getByRole("button", { name: "Saturday is a rest day" }).click();
  await page.getByRole("button", { name: "Sunday is a rest day" }).click();
  await page.getByRole("button", { name: "1 TO 3 YRS", exact: true }).click();
  await page.getByRole("button", { name: "FULL GYM", exact: true }).click();
  await next();
  await page.getByRole("button", { name: "VEGETARIAN", exact: true }).click();
  await page.getByRole("button", { name: "NO", exact: true }).click();
  await page.getByRole("button", { name: "Awaken", exact: true }).click();

  // The System speaks, then issues the plan. Tap through the message.
  await page.waitForTimeout(300);
  await page.mouse.click(180, 200);
  await page.getByRole("button", { name: "Use this plan" }).click();
  await page.waitForURL("**/app/quest");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
}
