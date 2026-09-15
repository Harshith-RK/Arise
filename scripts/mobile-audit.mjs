/**
 * Mobile audit. Opens every screen at phone widths and reports what a thumb or
 * a small screen would trip on. Runs against the local-only E2E server.
 *
 *   node scripts/mobile-audit.mjs            (server on :3100)
 */
import { chromium } from "playwright";

const BASE = process.env.AUDIT_URL ?? "http://localhost:3100";
// 360 and 369 are the common Android widths; a real 369px phone caught what 375 did not.
const WIDTHS = [320, 360, 369, 375, 390];
const MIN_TAP = 40;

const browser = await chromium.launch();
const issues = [];
const note = (width, where, kind, detail) => issues.push({ width, where, kind, detail });

async function audit(page, width, where) {
  await page.waitForTimeout(700);
  const r = await page.evaluate(({ MIN_TAP }) => {
    const vw = window.innerWidth;
    const out = { hscroll: document.documentElement.scrollWidth - vw, wide: [], clipped: [], small: [], spill: [], zoomInputs: [], hiddenByNav: [] };
    const visible = (el) => {
      const s = getComputedStyle(el);
      if (s.visibility === "hidden" || s.display === "none" || Number(s.opacity) === 0) return false;
      const b = el.getBoundingClientRect();
      return b.width > 0 && b.height > 0;
    };
    const inScroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === "auto" || o === "scroll" || o === "hidden") return true;
      }
      return false;
    };
    const label = (el) => {
      const t = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.tagName).trim().replace(/\s+/g, " ");
      return `${el.tagName.toLowerCase()} "${t.slice(0, 40)}"`;
    };
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el)) continue;
      const b = el.getBoundingClientRect();
      if ((b.right > vw + 1 || b.left < -1) && !inScroller(el) && getComputedStyle(el).position !== "fixed") {
        out.wide.push(`${label(el)} spans ${Math.round(b.left)}..${Math.round(b.right)}`);
      }
    }
    // Cut off inside a container that hides overflow: never crosses the screen
    // edge, so the check above cannot see it, but the user loses half a button.
    const clippers = (el) => {
      const list = [];
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        const cs = getComputedStyle(p);
        if (cs.overflowX === "auto" || cs.overflowX === "scroll") return null; // meant to scroll
        if (cs.overflowX === "hidden" || cs.overflowX === "clip") list.push(p);
      }
      return list;
    };
    for (const el of document.querySelectorAll('button, a[href], input, label, h1, h2, p, [role="button"]')) {
      if (!visible(el) || el.classList.contains("sr-only")) continue;
      const list = clippers(el);
      if (!list) continue;
      const b = el.getBoundingClientRect();
      for (const c of list) {
        const cb = c.getBoundingClientRect();
        if (b.right > cb.right + 1 || b.left < cb.left - 1) {
          out.clipped.push(`${label(el)} spans ${Math.round(b.left)}..${Math.round(b.right)}, box ends ${Math.round(cb.left)}..${Math.round(cb.right)}`);
          break;
        }
      }
    }
    const controls = document.querySelectorAll('button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], summary');
    for (const el of controls) {
      if (!visible(el) || el.closest("[aria-hidden='true']")) continue;
      // Visually hidden inputs driven by a visible label or button are not targets.
      if (el.classList.contains("sr-only")) continue;
      const b = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      // Links inside running text are exempt from target size (WCAG 2.5.8).
      if (el.tagName === "A" && s.display === "inline") continue;
      if (b.height < MIN_TAP || b.width < MIN_TAP) out.small.push(`${label(el)} ${Math.round(b.width)}x${Math.round(b.height)}`);
      if (el.tagName !== "INPUT" && el.scrollWidth > el.clientWidth + 2 && s.overflowX === "visible") {
        out.spill.push(`${label(el)} text needs ${el.scrollWidth}px in ${el.clientWidth}px`);
      }
      if (["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) && parseFloat(s.fontSize) < 16 && el.type !== "file" && el.type !== "checkbox") {
        out.zoomInputs.push(`${label(el)} font ${s.fontSize}`);
      }
    }
    return out;
  }, { MIN_TAP });

  if (r.hscroll > 1) note(width, where, "scrolls sideways", `${r.hscroll}px wider than the screen`);
  for (const d of [...new Set(r.wide)].slice(0, 6)) note(width, where, "wider than screen", d);
  for (const d of [...new Set(r.clipped)].slice(0, 6)) note(width, where, "cut off inside its box", d);
  for (const d of [...new Set(r.small)]) note(width, where, "small tap target", d);
  for (const d of [...new Set(r.zoomInputs)]) note(width, where, "input zooms on iPhone", d);
  for (const d of [...new Set(r.spill)]) note(width, where, "text spills out of its box", d);

  // Can the last thing on the page be reached above the bottom nav?
  const nav = page.locator('nav[aria-label="Primary"]').first();
  if (await nav.isVisible().catch(() => false)) {
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(300);
    const clash = await page.evaluate(() => {
      const nav = [...document.querySelectorAll('nav[aria-label="Primary"]')].find((n) => n.getBoundingClientRect().height > 0);
      const main = document.querySelector("#wa-main");
      if (!nav || !main) return null;
      const navTop = nav.getBoundingClientRect().top;
      const els = [...main.querySelectorAll("button, a[href], input")].filter((e) => e.getBoundingClientRect().height > 0);
      const last = els.at(-1);
      if (!last) return null;
      const b = last.getBoundingClientRect();
      return b.bottom > navTop + 1 ? `last control ends at ${Math.round(b.bottom)}, nav starts at ${Math.round(navTop)}` : null;
    });
    if (clash) note(width, where, "hidden behind bottom nav", clash);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  const slug = where.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  if (width === 375) await page.screenshot({ path: `screenshots/mobile/${slug}.png`, fullPage: true });
}

async function newPhone(width) {
  const ctx = await browser.newContext({
    viewport: { width, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: "dark",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => note(width, page.url(), "page error", e.message));
  return { ctx, page };
}

async function onboard(page, width) {
  const next = async () => { await page.getByRole("button", { name: "Next", exact: true }).tap(); await page.waitForTimeout(350); };
  await page.goto(`${BASE}/awaken`);
  await audit(page, width, "awaken 1 identity");
  await page.getByLabel("HUNTER NAME").fill("Mobile Hunter");
  await page.getByRole("button", { name: "MALE", exact: true }).tap();
  await page.getByLabel("AGE").fill("28");
  await page.getByLabel("HEIGHT").fill("172");
  await page.getByLabel("CURRENT WEIGHT").fill("84");
  await page.getByLabel("TARGET WEIGHT").fill("76");
  await next();
  await page.getByLabel("BODY FAT").fill("35.3");
  await page.getByLabel("SKELETAL MUSCLE").fill("34.9");
  await page.getByLabel("VISCERAL FAT").fill("14");
  await audit(page, width, "awaken 2 body scan");
  await page.getByLabel("BODY FAT").fill("24");
  await next();
  await page.getByLabel("GYM FROM").fill("18:00");
  await page.getByLabel("GYM UNTIL").fill("19:30");
  await page.getByRole("button", { name: "Saturday is a rest day" }).tap();
  await page.getByRole("button", { name: "Sunday is a rest day" }).tap();
  await page.getByRole("button", { name: "1 TO 3 YRS", exact: true }).tap();
  await page.getByRole("button", { name: "FULL GYM", exact: true }).tap();
  await page.getByRole("button", { name: "KNEE", exact: true }).tap();
  await audit(page, width, "awaken 3 training");
  await next();
  await page.getByRole("button", { name: "NON-VEG", exact: true }).tap();
  await page.getByRole("button", { name: "NO", exact: true }).tap();
  await audit(page, width, "awaken 4 diet");
  await page.getByRole("button", { name: "Awaken", exact: true }).tap();
  await page.waitForTimeout(1500);
  await audit(page, width, "awaken boot sequence");
  await page.mouse.click(Math.round(width / 2), 300);
  await page.getByText("THE SYSTEM HAS ISSUED YOUR PLAN").waitFor();
  await page.getByText("Meal plan").first().tap();
  await page.getByText("Training week").first().tap();
  await audit(page, width, "awaken plan screen");
  await page.getByRole("button", { name: "Use this plan" }).tap();
  await page.waitForURL(/app\/quest/, { timeout: 30000 });
}

const yesterday = (() => { const d = new Date(Date.now() - 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })();

for (const width of WIDTHS) {
  // Public screens, no Hunter.
  {
    const { ctx, page } = await newPhone(width);
    for (const [path, where] of [["/", "landing"], ["/legal/terms", "terms"], ["/legal/privacy", "privacy"], ["/auth", "sign in"], ["/offline", "offline"], ["/no-such-page", "404"]]) {
      await page.goto(`${BASE}${path}`);
      await audit(page, width, where);
    }
    await onboard(page, width);

    for (const [path, where] of [
      ["/app/quest", "quest"],
      [`/app/quest/${yesterday}`, "quest yesterday"],
      ["/app/status", "status"],
      ["/app/log", "log workout"],
      ["/app/log?tab=diet", "log diet"],
      ["/app/log/diet/supplies", "supplies"],
      ["/app/log/workout/mon", "workout day"],
      ["/app/progress", "progress telemetry"],
      ["/app/progress?tab=badges", "progress badges"],
      ["/app/progress/badges/first-gate", "badge detail"],
      ["/app/system", "system"],
      ["/app/system/targets", "targets"],
      ["/app/system/plan/workout", "workout editor"],
      ["/app/system/plan/diet", "diet editor"],
    ]) {
      await page.goto(`${BASE}${path}`);
      await audit(page, width, where);
    }

    // First exercise detail, from the workout day.
    await page.goto(`${BASE}/app/log/workout/mon`);
    const ex = page.locator('a[href*="/app/log/exercise/"]').first();
    if (await ex.count()) { await ex.tap(); await page.waitForURL(/exercise/); await audit(page, width, "exercise detail"); }

    // Overlays.
    await page.goto(`${BASE}/app/quest`);
    await page.getByRole("button", { name: "Search commands" }).tap();
    await audit(page, width, "command palette");
    await page.keyboard.press("Escape");

    await page.goto(`${BASE}/app/status`);
    await page.getByRole("button", { name: /LOG WEIGH-IN/i }).tap();
    await audit(page, width, "weigh-in sheet");

    await page.goto(`${BASE}/app/quest/${yesterday}`);
    await page.waitForTimeout(800);
    const diet = page.getByRole("button", { name: /^Diet/ });
    if ((await diet.getAttribute("aria-expanded")) !== "true") await diet.tap();
    const details = page.getByRole("button", { name: /^(Open details|Details)/ }).first();
    if (await details.count()) { await details.tap(); await audit(page, width, "meal details sheet"); await page.keyboard.press("Escape"); }

    await page.goto(`${BASE}/app/quest/${yesterday}`);
    await page.waitForTimeout(800);
    const workout = page.getByRole("button", { name: /^Workout|^Bonus quest/ });
    if ((await workout.getAttribute("aria-expanded")) !== "true") await workout.tap();
    const sets = page.locator("section").filter({ has: workout }).getByRole("button", { name: /^Open details for/ }).first();
    if (await sets.count()) { await sets.tap(); await audit(page, width, "sets sheet"); await page.keyboard.press("Escape"); }
    else note(width, "sets sheet", "not audited", "no exercise on yesterday's plan");

    // Streak calendar, from Status.
    await page.goto(`${BASE}/app/status`);
    const streak = page.getByRole("button", { name: /streak/i }).first();
    if (await streak.count()) { await streak.tap(); await audit(page, width, "streak calendar sheet"); await page.keyboard.press("Escape"); }

    await ctx.close();
  }
}
await browser.close();

const byKind = {};
for (const i of issues) (byKind[i.kind] ??= []).push(i);
for (const [kind, list] of Object.entries(byKind)) {
  console.log(`\n== ${kind} (${list.length})`);
  const grouped = {};
  for (const i of list) (grouped[`${i.where}: ${i.detail}`] ??= []).push(i.width);
  for (const [k, ws] of Object.entries(grouped)) console.log(`  [${ws.join(",")}] ${k}`);
}
console.log(`\n${issues.length} issues`);
