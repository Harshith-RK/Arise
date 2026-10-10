import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";
import { toKey } from "../src/lib/engine/dates";

/** The most recent training day: the seeded week rests at the weekend. */
function trainingDay(): string {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return toKey(d);
}

test("the rest timer keeps running when the page changes", async ({ page }) => {
  await awaken(page);
  const day = trainingDay();
  await page.goto(day === toKey(new Date()) ? "/app/quest" : `/app/quest/${day}`);
  await page.waitForTimeout(600);

  // Log one set: the rest starts.
  await page.getByRole("button", { name: /^Open details for/ }).first().click();
  const sheet = page.getByRole("dialog").filter({ has: page.getByText("WEIGHT USED") }).first();
  await sheet.getByRole("button", { name: /^SET 1/ }).click();
  await page.keyboard.press("Escape");

  const clock = page.getByLabel("Dismiss rest timer");
  await expect(clock).toBeVisible();
  const read = async () => {
    const text = await page.locator("text=/^\\d\\d:\\d\\d$/").first().innerText();
    const [m, s] = text.split(":").map(Number);
    return m * 60 + s;
  };
  const started = await read();
  expect(started).toBeGreaterThan(0);

  // Walk away to another page: the rest is still running, and still counting.
  await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Progress" }).click();
  await expect(page.getByLabel("Dismiss rest timer")).toBeVisible();
  await page.waitForTimeout(2500);
  const later = await read();
  expect(later).toBeLessThan(started);

  // And on the way back.
  await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Quest" }).click();
  await expect(page.getByLabel("Dismiss rest timer")).toBeVisible();
  expect(await read()).toBeLessThanOrEqual(later);

  // It can still be dismissed.
  await page.getByLabel("Dismiss rest timer").click();
  await expect(page.getByLabel("Dismiss rest timer")).toHaveCount(0);
});
