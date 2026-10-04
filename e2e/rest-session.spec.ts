import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";
import { toKey } from "../src/lib/engine/dates";

/** The most recent Saturday: a rest day in the seeded week, and never in the
 *  future, since a future quest is read-only. */
function lastSaturday(): string {
  const d = new Date();
  while (d.getDay() !== 6) d.setDate(d.getDate() - 1);
  return toKey(d);
}

test("a rest day can hold an optional session that is only shown when asked for", async ({ page }) => {
  await awaken(page);

  // Give Saturday an abs session in the plan.
  await page.goto("/app/system/plan/workout/1");
  await page.getByRole("button", { name: "SAT" }).click();
  await page.getByLabel("DAY TITLE").fill("Abs");
  await page.getByRole("button", { name: "Add exercise" }).click();
  await page.getByLabel("NAME").last().fill("Hanging leg raise");
  await page.getByRole("button", { name: "Update version 1" }).first().click();
  await expect(page.getByText("[Plan Updated]")).toBeVisible();

  // On the rest day it is offered, not owed.
  const rest = lastSaturday();
  await page.goto(`/app/quest/${rest}`);
  await page.waitForTimeout(700);
  await expect(page.getByRole("heading", { name: "Rest day" })).toBeVisible();
  const panel = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await panel.getAttribute("aria-expanded")) !== "true") await panel.click();

  // The exercises are hidden behind the offer.
  await expect(page.getByText("Hanging leg raise")).toHaveCount(0);
  await page.getByRole("button", { name: "Do abs today" }).click();
  await expect(page.getByText("Hanging leg raise")).toBeVisible();

  // Doing it does not change the day being a rest day.
  await expect(page.getByRole("heading", { name: "Rest day" })).toBeVisible();
});
