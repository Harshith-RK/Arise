import { chromium } from "playwright";
const EMAIL = `arise.test.${Date.now()}@gmail.com`;
const PASS = "hunter-rank-e-2026";
const ctx = await chromium.launchPersistentContext(".playwright-profile-auth", {
  viewport: { width: 900, height: 950 }, colorScheme: "dark",
});
const page = ctx.pages()[0] ?? await ctx.newPage();
const errs = []; page.on("pageerror", e => errs.push(e.message));

await page.goto("http://localhost:3000/auth", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.getByRole("button", { name: /Create one/i }).click();
await page.waitForTimeout(300);
await page.getByLabel("EMAIL").fill(EMAIL);
await page.getByLabel("PASSWORD").fill(PASS);
await page.getByRole("button", { name: /Create Hunter/i }).click();
await page.waitForTimeout(4000);

console.log("email:", EMAIL);
console.log("url after signup:", page.url());
const alert = await page.locator('[role="alert"]').count();
if (alert) console.log("ERROR SHOWN:", await page.locator('[role="alert"]').innerText());
console.log("signed in:", await page.evaluate(() => Object.keys(localStorage).some(k => k.includes("auth-token"))));
await page.screenshot({ path: "screenshots/signup-result.png" });
console.log(errs.length ? "PAGE ERRORS: "+errs.join(" | ") : "no page errors");
await ctx.close();
