import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";

test("a meal counts its own macros from its items", async ({ page }) => {
  await page.setViewportSize({ width: 369, height: 820 });
  await awaken(page);
  await page.goto("/app/system/plan/diet");

  const meal = page.locator("li").filter({ has: page.getByLabel("ITEMS") }).first();
  const items = meal.getByLabel("ITEMS");
  const name = await meal.getByLabel("NAME").inputValue();
  const kcal = meal.getByLabel(`${name} calories`);
  const protein = meal.getByLabel(`${name} protein`);
  await expect(meal.getByText("COUNTED FROM THE ITEMS ABOVE.")).toBeVisible();

  await items.fill("Paneer 200g");
  await expect(kcal).toHaveValue("530");
  await expect(protein).toHaveValue("37");
  await page.screenshot({ path: "screenshots/mobile/diet-counted.png" });

  // A number typed by hand is left alone, and offers the counted one back.
  await kcal.fill("800");
  await items.fill("Paneer 100g");
  await expect(kcal).toHaveValue("800");
  await expect(meal.getByText(/THE ITEMS COUNT AS 265 KCAL/)).toBeVisible();
  await meal.getByRole("button", { name: "USE THAT" }).click();
  await expect(kcal).toHaveValue("265");
  await expect(protein).toHaveValue("18");

  // A food the library does not know is named, not silently counted as zero.
  await items.fill("Grandmother special halwa");
  await expect(meal.getByText(/NOT IN THE FOOD LIST/)).toBeVisible();
});

test("a cleared macro box stays empty, and the diet plan can be updated in place", async ({ page }) => {
  await awaken(page);
  await page.goto("/app/system/plan/diet");

  const meal = page.locator("li").filter({ has: page.getByLabel("ITEMS") }).first();
  const name = await meal.getByLabel("NAME").inputValue();
  const kcal = meal.getByLabel(`${name} calories`);

  // Clearing leaves the box empty, not snapped to 0, and blocks saving.
  await kcal.fill("");
  await expect(kcal).toHaveValue("");
  await expect(meal.getByText("Enter a number")).toBeVisible();
  await expect(page.getByRole("button", { name: "Update version 1" }).first()).toBeDisabled();

  await kcal.fill("612");
  await page.getByRole("button", { name: "Update version 1" }).first().click();
  await expect(page.getByText("[Plan Updated]")).toBeVisible();
  await expect(page.getByText(/EDITING V1/)).toBeVisible();
  await page.reload();
  await expect(page.locator("li").filter({ has: page.getByLabel("ITEMS") }).first().getByLabel(`${name} calories`)).toHaveValue("612");
});
