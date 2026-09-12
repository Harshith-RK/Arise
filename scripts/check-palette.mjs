/** Verifies the command palette: position, visibility, and dismissal. */
import { chromium } from "playwright";

const ctx = await chromium.launchPersistentContext(".playwright-profile", {
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto("http://localhost:3000/app/quest", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

await page.keyboard.press("Meta+k");
await page.waitForTimeout(600);

const box = await page.locator("[cmdk-dialog]").boundingBox();
const vw = 1440;
console.log("panel box:", JSON.stringify(box));
console.log("centered horizontally:", box && Math.abs(box.x + box.width / 2 - vw / 2) < 4);
console.log("input visible:", await page.locator("[cmdk-input]").isVisible());
await page.screenshot({ path: "screenshots/palette-open.png" });

// Type to confirm filtering works
await page.keyboard.type("prog");
await page.waitForTimeout(400);
await page.screenshot({ path: "screenshots/palette-filtered.png" });

// Click blank space well away from the panel
await page.mouse.click(120, 800);
await page.waitForTimeout(500);
console.log("closed after outside click:", (await page.locator("[cmdk-dialog]").count()) === 0);

// Escape should also close
await page.keyboard.press("Meta+k");
await page.waitForTimeout(400);
await page.keyboard.press("Escape");
await page.waitForTimeout(400);
console.log("closed after Escape:", (await page.locator("[cmdk-dialog]").count()) === 0);

console.log(errors.length ? `page errors: ${errors.join(", ")}` : "no page errors");
await ctx.close();
