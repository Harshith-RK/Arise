#!/usr/bin/env node
/**
 * Dev screenshot helper. Uses a persistent browser profile so the Hunter
 * seeded by scripts/walk.mjs (IndexedDB) survives between captures.
 *
 *   node scripts/shot.mjs /app/quest [--w 390] [--h 900] [--out name]
 *                         [--skin whiteout] [--scheme light] [--full]
 *                         [--wait 1400] [--reduced] [--fresh]
 */
import { chromium } from "playwright";
import { mkdirSync, rmSync } from "node:fs";

const args = process.argv.slice(2);
const routes = args.filter((a) => a.startsWith("/"));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const has = (name) => args.includes(`--${name}`);

const width = Number(flag("w", 390));
const height = Number(flag("h", 900));
const outDir = flag("dir", "screenshots");
const skin = flag("skin", null);
const base = flag("base", "http://localhost:3000");
const profileDir = flag("profile", ".playwright-profile");

mkdirSync(outDir, { recursive: true });
if (has("fresh")) rmSync(profileDir, { recursive: true, force: true });

const ctx = await chromium.launchPersistentContext(profileDir, {
  viewport: { width, height },
  deviceScaleFactor: 2,
  colorScheme: flag("scheme", "dark"),
  reducedMotion: has("reduced") ? "reduce" : "no-preference",
});
const page = ctx.pages()[0] ?? (await ctx.newPage());

const errors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});
page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));

for (const route of routes) {
  await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
  if (skin) await page.evaluate((s) => document.documentElement.setAttribute("data-skin", s), skin);
  // Let entrance motion settle so captures are evidence, not mid-animation.
  await page.waitForTimeout(Number(flag("wait", 1400)));
  const name = flag("out", null) ?? (route.replace(/\//g, "_").replace(/^_/, "") || "root");
  const file = `${outDir}/${name}-${width}${skin ? `-${skin}` : ""}.png`;
  await page.screenshot({ path: file, fullPage: has("full") });
  console.log(`saved ${file}  (${page.url()})`);
}

console.log(errors.length ? `\nconsole errors:\n  ${[...new Set(errors)].slice(0, 12).join("\n  ")}` : "\nno console errors");
await ctx.close();
