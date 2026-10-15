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

test("cardio can be logged on a rest day, with its minutes and calories", async ({ page }) => {
  await awaken(page);
  await page.goto(`/app/quest/${lastSaturday()}`);
  await page.waitForTimeout(600);
  const panel = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await panel.getAttribute("aria-expanded")) !== "true") await panel.click();

  // The row is offered, not owed.
  // The quest rows are the tickable ones; the steppers share the word.
  const cardio = page.locator("[data-quest-row]").filter({ hasText: "Cardio" }).first();
  await expect(cardio).toBeVisible();
  await expect(page.getByText(/OPTIONAL \/ \d+ KCAL/)).toBeVisible();

  // What was actually done is recorded, not just that something was.
  await page.getByRole("group", { name: "Cardio minutes" }).getByRole("button", { name: "Increase Cardio minutes" }).click();
  await cardio.click();
  await expect(cardio).toHaveAttribute("aria-pressed", "true");

  await page.reload();
  await page.waitForTimeout(700);
  // The panel opens on the first unfinished thing, so it is opened again here.
  const again = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await again.getAttribute("aria-expanded")) !== "true") await again.click();
  const after = page.locator("[data-quest-row]").filter({ hasText: "Cardio" }).first();
  await expect(after).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByText(/50 MIN/)).toBeVisible();

  // The day is still a rest day, cleared on diet alone.
  await expect(page.getByRole("heading", { name: "Rest day" })).toBeVisible();
});

test("the bonus quest is offered, accepted, cleared and can be dropped", async ({ page }) => {
  await awaken(page);
  await page.goto(`/app/quest/${lastSaturday()}`);
  await page.waitForTimeout(600);
  const panel = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await panel.getAttribute("aria-expanded")) !== "true") await panel.click();

  // Offered, not owed: nothing to tick until it is taken on.
  const accept = page.getByRole("button", { name: "Accept the bonus quest" });
  await expect(accept).toBeVisible();
  await expect(page.locator("[data-quest-row]").filter({ hasText: "Extra work today" })).toHaveCount(0);

  await accept.click();
  const row = page.locator("[data-quest-row]").filter({ hasText: "Extra work today" }).first();
  await expect(row).toBeVisible();
  await expect(accept).toHaveCount(0);

  // It survives a reload: accepting is part of the day, not of this screen.
  await page.reload();
  await page.waitForTimeout(700);
  const again = page.getByRole("button", { name: /^Bonus quest/ });
  if ((await again.getAttribute("aria-expanded")) !== "true") await again.click();
  await expect(page.locator("[data-quest-row]").filter({ hasText: "Extra work today" }).first()).toBeVisible();

  // Clearing it pays, and dropping it puts the offer back.
  await page.locator("[data-quest-row]").filter({ hasText: "Extra work today" }).first().click();
  await expect(page.getByText("[Bonus Quest]")).toBeVisible();
  await page.getByRole("button", { name: "DROP THE QUEST" }).click();
  await expect(page.getByRole("button", { name: "Accept the bonus quest" })).toBeVisible();
});
