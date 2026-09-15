import { expect, test } from "@playwright/test";

/*
 * The sign-in gate only exists when accounts are on, which the local-only E2E
 * server deliberately is not. These run against the real dev server instead,
 * when one is up, and never sign in, so they create nothing in the database.
 */
const LIVE = process.env.ARISE_LIVE_URL ?? "http://localhost:3000";

test.describe("sign-in gate", () => {
  test.beforeAll(async ({ request }) => {
    const up = await request.get(LIVE).then((r) => r.ok()).catch(() => false);
    test.skip(!up, `no dev server with accounts at ${LIVE}`);
  });

  for (const path of ["/awaken", "/app/quest", "/app/system", "/app/log?tab=diet"]) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await page.goto(`${LIVE}${path}`);
      await expect(page).toHaveURL(/\/auth\?next=/);
      expect(decodeURIComponent(new URL(page.url()).searchParams.get("next") ?? "")).toBe(path);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("the landing page's way in goes to sign in", async ({ page }) => {
    await page.goto(LIVE);
    const begin = page.getByRole("link", { name: "Sign in to begin" }).first();
    await expect(begin).toBeVisible();
    await begin.click();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test("the landing page and legal pages stay open without an account", async ({ page }) => {
    for (const path of ["/", "/legal/terms", "/legal/privacy"]) {
      await page.goto(`${LIVE}${path}`);
      await expect(page).not.toHaveURL(/\/auth/);
    }
  });
});
