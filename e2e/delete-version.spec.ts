import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";

test("a workout version can be deleted, and undone", async ({ page }) => {
  await awaken(page);
  await page.goto("/app/system/plan/workout");

  // Only one version: the bin is there but does nothing.
  await expect(page.getByRole("button", { name: "Delete version 1" })).toBeDisabled();

  await page.getByRole("link", { name: "Create another version" }).click();
  await page.getByLabel("SETS").first().fill("3");
  await page.getByRole("button", { name: "Save as version 2" }).first().click();
  await expect(page.getByRole("link", { name: /Version 2/ })).toBeVisible();

  // Two taps: the first arms, the second deletes.
  await page.getByRole("button", { name: "Delete version 2" }).click();
  await expect(page.getByText(/TAP THE BIN AGAIN TO DELETE VERSION 2/)).toBeVisible();
  await page.getByRole("button", { name: /Delete version 2, tap again/ }).click();
  await expect(page.getByText("[Plan Updated]")).toBeVisible();
  await expect(page.getByRole("link", { name: /Version 2/ })).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(page.getByRole("link", { name: /Version 2/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: /Version 2/ })).toBeVisible();
});

test("a diet version can be deleted from its editor", async ({ page }) => {
  await awaken(page);
  await page.goto("/app/system/plan/diet");
  // One version only: no delete offered.
  await expect(page.getByRole("button", { name: /Delete version/ })).toHaveCount(0);

  await page.getByLabel("NAME").first().fill("Second version");
  await page.getByRole("button", { name: "Save as version 2" }).first().click();
  await expect(page.getByText(/EDITING V2/)).toBeVisible();

  await page.getByRole("button", { name: "Delete version 2" }).click();
  await page.getByRole("button", { name: /Tap again to delete version 2/ }).click();
  await expect(page.getByText("[Plan Updated]")).toBeVisible();
  await expect(page.getByText(/EDITING V1/)).toBeVisible();
});
