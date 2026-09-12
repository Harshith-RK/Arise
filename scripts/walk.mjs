#!/usr/bin/env node
/**
 * Dev walkthrough: completes onboarding, logs a few quests, and captures
 * screenshots along the way. Used to verify real flows, not just renders.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = "http://localhost:3000";
const width = Number(process.argv.includes("--w") ? process.argv[process.argv.indexOf("--w") + 1] : 390);
const outDir = "screenshots";
mkdirSync(outDir, { recursive: true });

const ctx = await chromium.launchPersistentContext(".playwright-profile", {
  viewport: { width, height: 900 },
  deviceScaleFactor: 2,
  colorScheme: "dark",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

const shot = async (name) => {
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outDir}/${name}-${width}.png` });
  console.log(`saved ${name}`);
};

await page.goto(`${base}/awaken`, { waitUntil: "networkidle" });
// Skip the boot sequence.
await page.mouse.click(width / 2, 200);
await page.waitForTimeout(400);

// Step 1 -> 5
for (let i = 0; i < 4; i++) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.waitForTimeout(320);
}
await shot("awaken-confirm");
await page.getByRole("button", { name: "Accept the System" }).click();
await page.waitForURL("**/app/quest", { timeout: 15_000 });
await page.waitForTimeout(1200);
await shot("quest-fresh");

// Clear two exercises and a meal to exercise the ignite + heat transfer.
const rows = page.locator("[data-quest-row]");
const count = await rows.count();
console.log(`quest rows: ${count}`);
if (count > 0) {
  await rows.nth(0).click();
  await page.waitForTimeout(600);
  await rows.nth(1).click();
  await page.waitForTimeout(900);
}
await shot("quest-logged");

// Open the diet category and eat a meal.
await page.getByRole("button", { name: /^Diet/ }).click();
await page.waitForTimeout(500);
await shot("quest-diet");

console.log(errors.length ? `\nconsole errors:\n  ${[...new Set(errors)].join("\n  ")}` : "\nno console errors");
await ctx.close();
