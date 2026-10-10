import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";
import { addDays, toKey } from "../src/lib/engine/dates";

/** The most recent day that has exercises on it: the seeded week rests at the weekend. */
function lastTrainingDay(): string {
  const d = new Date();
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
  return toKey(d);
}

test("re-ticking a set records the weight on the stepper now", async ({ page }) => {
  await awaken(page);
  const day = lastTrainingDay();
  await page.goto(day === toKey(new Date()) ? "/app/quest" : `/app/quest/${day}`);
  await page.waitForTimeout(600);

  await page.getByRole("button", { name: /^Open details for/ }).first().click();
  const sheet = page.getByRole("dialog").filter({ has: page.getByText("WEIGHT USED") }).first();
  const set1 = sheet.getByRole("button", { name: /^SET 1/ });

  // Tick it at bodyweight, as the sheet opens with nothing lifted yet.
  await set1.click();
  await expect(set1).toContainText("BW");

  // Untick, raise the weight, tick again: the new weight is what counts.
  await set1.click();
  await expect(set1).toContainText("TAP");
  for (let i = 0; i < 3; i++) await sheet.getByRole("button", { name: "Increase Weight" }).click();
  await set1.click();
  // "not BW" is also true of the unticked "TAP", so wait for the weight itself.
  await expect(set1).toContainText("KG");
  const kg = (await set1.innerText()).match(/(\d+(?:\.\d+)?)KG/)?.[1];
  expect(kg).toBeTruthy();

  // It survives a reload, so it really reached the log.
  await page.reload();
  await page.waitForTimeout(700);
  await page.getByRole("button", { name: /^Open details for/ }).first().click();
  await expect(page.getByRole("button", { name: /^SET 1/ })).toContainText(`${kg}KG`);
});
