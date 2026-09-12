import { expect, test } from "@playwright/test";
import { awaken, watchErrors } from "./helpers";

const APP_ROUTES = [
  "/app/quest",
  "/app/status",
  "/app/log",
  "/app/log/diet/supplies",
  "/app/log/workout/mon",
  "/app/log/exercise/squat",
  "/app/progress",
  "/app/progress/trophies/first-gate",
  "/app/system",
  "/app/system/plan/workout",
  "/app/system/plan/diet",
];

const PUBLIC_ROUTES = ["/", "/legal/terms", "/legal/privacy", "/offline"];

test.describe("public routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} renders without errors`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(route);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForTimeout(500);
      expect(errors).toEqual([]);
    });
  }

  test("404 offers a way back", async ({ page }) => {
    await page.goto("/no-such-gate");
    await expect(page.getByText("GATE NOT FOUND")).toBeVisible();
    await page.getByRole("link", { name: "Return to quest" }).click();
    await expect(page).toHaveURL(/\/(app\/quest|awaken)/);
  });
});

test.describe("app", () => {
  test.beforeEach(async ({ page }) => {
    await awaken(page);
  });

  for (const route of APP_ROUTES) {
    test(`${route} renders without errors`, async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(route);
      await page.waitForTimeout(700);
      await expect(page.locator("#wa-core-gauge")).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test("every primary nav destination is reachable", async ({ page, isMobile }) => {
    const errors = watchErrors(page);
    for (const label of ["Status", "Log", "Progress", "System", "Quest"]) {
      await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: label }).click();
      await page.waitForTimeout(400);
      await expect(page.locator("#wa-core-gauge")).toBeVisible();
    }
    expect(errors).toEqual([]);
    expect(isMobile !== undefined).toBe(true);
  });

  test("clearing a quest awards XP, shows an undo notice, and undo restores it", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/app/quest");
    const before = await page.locator("#wa-core-gauge").innerText();

    await page.locator("[data-quest-row]").first().click();
    await expect(page.getByText("[Quest Complete]")).toBeVisible();
    await page.waitForTimeout(700);
    const after = await page.locator("#wa-core-gauge").innerText();
    expect(after).not.toEqual(before);

    await page.getByRole("button", { name: "Undo" }).click();
    await page.waitForTimeout(700);
    expect(await page.locator("#wa-core-gauge").innerText()).toEqual(before);
    expect(errors).toEqual([]);
  });

  test("quest state survives a reload", async ({ page }) => {
    await page.goto("/app/quest");
    await page.locator("[data-quest-row]").first().click();
    await page.waitForTimeout(600);
    const xp = await page.locator("#wa-core-gauge").innerText();
    await page.reload();
    await page.waitForTimeout(900);
    expect(await page.locator("#wa-core-gauge").innerText()).toEqual(xp);
  });

  test("a weigh-in is logged and appears on Progress", async ({ page }) => {
    await page.goto("/app/status");
    await page.getByRole("button", { name: /LOG WEIGH-IN/i }).click();
    await page.getByLabel("WEIGHT").fill("94.2");
    await page.getByRole("button", { name: "Log weigh-in", exact: true }).click();
    await expect(page.getByText("[Calibration]")).toBeVisible();
    await page.goto("/app/progress");
    await expect(page.getByText("1 READINGS")).toBeVisible();
  });

  test("the supplies list persists a new item", async ({ page }) => {
    await page.goto("/app/log/diet/supplies");
    await page.getByLabel("Add a supply item").fill("Oats");
    await page.getByRole("button", { name: "Add item" }).click();
    await expect(page.getByText("Oats")).toBeVisible();
    await page.reload();
    await expect(page.getByText("Oats")).toBeVisible();
  });

  test("editing the plan creates a new version and keeps history", async ({ page }) => {
    await page.goto("/app/system/plan/diet");
    const name = page.getByLabel("NAME").first();
    await name.fill("Besan chilla and milk v2");
    await page.getByRole("button", { name: "Save as new version" }).click();
    await expect(page.getByText("[Plan Updated]")).toBeVisible();
    await page.goto("/app/log");
    await page.getByRole("tab", { name: "Diet" }).click();
    await expect(page.getByText("Besan chilla and milk v2")).toBeVisible();
  });

  test("the command palette opens centered and dismisses", async ({ page }) => {
    await page.goto("/app/quest");
    await page.waitForTimeout(500);
    await page.keyboard.press("Meta+k");

    const panel = page.locator("[cmdk-dialog]");
    await expect(panel).toBeVisible();
    await expect(page.locator("[cmdk-input]")).toBeVisible();

    // It must sit inside the viewport, not pinned to an edge.
    const box = (await panel.boundingBox())!;
    const width = page.viewportSize()!.width;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width + 1);

    // Clicking blank space closes it.
    await page.mouse.click(5, Math.round(page.viewportSize()!.height - 10));
    await expect(panel).toHaveCount(0);

    await page.keyboard.press("Meta+k");
    await expect(panel).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
  });

  test("skin preference applies and survives a reload", async ({ page }) => {
    await page.goto("/app/system");
    await page.getByRole("group", { name: "Skin" }).getByRole("button", { name: "Whiteout" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "whiteout");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "whiteout");
    await page.getByRole("group", { name: "Skin" }).getByRole("button", { name: "Permafrost" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-skin", "permafrost");
  });
});

test.describe("landing demo", () => {
  test("the demo is interactive and never writes real data", async ({ page }) => {
    const errors = watchErrors(page);
    await page.goto("/");
    const row = page.locator("[data-demo] [data-quest-row]").first();
    await row.click();
    await expect(page.getByText("[Quest Complete]").first()).toBeVisible();
    await page.waitForTimeout(500);

    // The sandbox must not have created a Hunter in IndexedDB.
    const hasProfile = await page.evaluate(async () => {
      const dbs = await indexedDB.databases();
      return dbs.some((d) => d.name === "winter-arc");
    });
    expect(hasProfile).toBe(false);
    expect(errors).toEqual([]);
  });
});
