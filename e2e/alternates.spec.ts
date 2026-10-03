import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";

/** The exercise block for the first exercise of the day. */
const exercise = (page: import("@playwright/test").Page) =>
  page.locator("li").filter({ has: page.getByLabel("REGION") }).first();

test("an alternate can be renamed and given its own reps", async ({ page }) => {
  await awaken(page);
  await page.goto("/app/system/plan/workout/1");
  const first = exercise(page);
  await expect(first.getByLabel("ALTERNATE 1")).toBeVisible();

  await first.getByLabel("ALTERNATE 1").fill("Floor chest press");
  await first.getByLabel("Floor chest press reps min").fill("10");
  await first.getByLabel("Floor chest press reps max").fill("15");
  await page.getByRole("button", { name: "Update version 1" }).first().click();
  await expect(page.getByText("[Plan Updated]")).toBeVisible();

  await page.reload();
  await expect(exercise(page).getByLabel("ALTERNATE 1")).toHaveValue("Floor chest press");
  await expect(exercise(page).getByLabel("Floor chest press reps min")).toHaveValue("10");

  // The quest offers the swap under its new name, inside the exercise's sheet.
  // A Monday, since the seeded week rests at the weekend.
  const monday = new Date();
  monday.setDate(monday.getDate() + ((8 - monday.getDay()) % 7 || 7));
  await page.goto(`/app/quest/${monday.toISOString().slice(0, 10)}`);
  await page.getByRole("button", { name: /^Open details for/ }).first().click();
  await expect(page.getByRole("button", { name: "Floor chest press" })).toBeVisible();
});

test("an alternate can be added, promoted to the main lift, and removed", async ({ page }) => {
  await awaken(page);
  await page.goto("/app/system/plan/workout/1");
  const first = exercise(page);
  const mainName = await first.getByLabel("NAME").inputValue();
  const before = await first.getByLabel(/^ALTERNATE \d$/).count();

  await first.getByRole("button", { name: "Add alternate" }).click();
  const added = first.getByLabel(`ALTERNATE ${before + 1}`);
  await added.fill("Floor press");

  // Promote it: the row's own button, not whichever came last.
  const row = page.locator("li").filter({ has: page.getByLabel(`ALTERNATE ${before + 1}`) }).last();
  await row.getByRole("button", { name: "Make the main lift" }).click();
  await expect(first.getByLabel("NAME")).toHaveValue("Floor press");
  // The old main lift is kept, now as the first alternate.
  await expect(first.getByLabel("ALTERNATE 1")).toHaveValue(mainName);

  // Removing one takes it off the list.
  await first.getByRole("button", { name: `Remove ${mainName} as an alternate for Floor press` }).click();
  await expect(first.getByLabel(/^ALTERNATE \d$/)).toHaveCount(before);

  await page.getByRole("button", { name: "Update version 1" }).first().click();
  await expect(page.getByText("[Plan Updated]")).toBeVisible();
  await page.reload();
  await expect(exercise(page).getByLabel("NAME")).toHaveValue("Floor press");
  await expect(exercise(page).getByLabel(/^ALTERNATE \d$/)).toHaveCount(before);
});
