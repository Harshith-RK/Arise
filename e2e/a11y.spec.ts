import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { awaken } from "./helpers";

const ROUTES = [
  "/",
  "/legal/terms",
  "/legal/privacy",
  "/app/quest",
  "/app/status",
  "/app/log",
  "/app/progress",
  "/app/system",
  "/app/log/diet/supplies",
  "/app/log/workout/mon",
  "/app/log/exercise/squat",
];

/** WCAG 2.2 AA, both skins. */
test.describe("accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await awaken(page);
  });

  for (const route of ROUTES) {
    for (const skin of ["permafrost", "whiteout"] as const) {
      test(`${route} has no violations (${skin})`, async ({ page }) => {
        await page.goto(route);
        await page.evaluate((s) => document.documentElement.setAttribute("data-skin", s), skin);
        await page.waitForTimeout(700);

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        const summary = results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          nodes: v.nodes.length,
          target: v.nodes[0]?.target?.join(" "),
          help: v.help,
        }));
        expect(summary).toEqual([]);
      });
    }
  }

  test("keyboard reaches and clears a quest", async ({ page }) => {
    await page.goto("/app/quest");
    await page.waitForTimeout(600);
    const row = page.locator("[data-quest-row]").first();
    await row.focus();
    await expect(row).toBeFocused();
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
    await expect(row).toHaveAttribute("aria-pressed", "true");

    // J moves focus to the next quest.
    await page.keyboard.press("j");
    await expect(page.locator("[data-quest-row]").nth(1)).toBeFocused();
  });

  test("focus is visible on interactive elements", async ({ page }) => {
    await page.goto("/app/quest");
    await page.waitForTimeout(500);
    const row = page.locator("[data-quest-row]").first();
    await row.focus();
    const outline = await row.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThan(0);
  });
});
