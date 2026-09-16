import { expect, test } from "@playwright/test";

test("the password can be shown and hidden", async ({ page }) => {
  await page.setViewportSize({ width: 369, height: 820 });
  await page.goto("/auth");
  const field = page.getByLabel("PASSWORD", { exact: true });
  await field.fill("winter arc 99");
  await expect(field).toHaveAttribute("type", "password");

  await page.getByRole("button", { name: "Show password" }).click();
  await expect(field).toHaveAttribute("type", "text");
  await expect(field).toHaveValue("winter arc 99");
  await page.screenshot({ path: "screenshots/mobile/auth-password-shown.png" });

  await page.getByRole("button", { name: "Hide password" }).click();
  await expect(field).toHaveAttribute("type", "password");
});
