import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";

const names = (page: import("@playwright/test").Page) => page.getByLabel("NAME").all();

async function mealNames(page: import("@playwright/test").Page) {
  return Promise.all((await names(page)).map((f) => f.inputValue()));
}

test("meals can be moved up and down, and the order sticks", async ({ page }) => {
  await awaken(page);
  await page.goto("/app/system/plan/diet");

  const before = await mealNames(page);
  expect(before.length).toBeGreaterThan(2);

  // The first meal cannot go earlier, the last cannot go later.
  await expect(page.getByRole("button", { name: `Move ${before[0]} earlier` })).toBeDisabled();
  await expect(page.getByRole("button", { name: `Move ${before[before.length - 1]} later` })).toBeDisabled();

  // Walk the third meal up one place.
  await page.getByRole("button", { name: `Move ${before[2]} earlier` }).click();
  const moved = [...before];
  [moved[1], moved[2]] = [moved[2], moved[1]];
  expect(await mealNames(page)).toEqual(moved);

  await page.getByRole("button", { name: "Update version 1" }).first().click();
  await expect(page.getByText(/EDITING V1/)).toBeVisible();
  await page.reload();
  // The editor paints before the plan is read back, so wait for the list.
  await expect(page.getByLabel("NAME")).toHaveCount(before.length);
  expect(await mealNames(page)).toEqual(moved);

  // The quest lists them in the new order too.
  await page.goto("/app/quest");
  await page.waitForTimeout(600);
  const diet = page.getByRole("button", { name: /^Diet/ });
  if ((await diet.getAttribute("aria-expanded")) !== "true") await diet.click();
  const shown = await page.locator("[data-quest-row]").filter({ hasText: moved[1] }).first();
  await expect(shown).toBeVisible();
});
