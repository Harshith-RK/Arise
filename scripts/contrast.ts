/**
 * WCAG contrast audit for every skin x rank temperature.
 * Reads tokens straight from src/app/globals.css so it can never drift.
 * Run: npx tsx scripts/contrast.ts   (exits 1 on any failure)
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

type Tokens = Record<string, string>;

const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

function parseBlock(selectorRe: RegExp): Tokens {
  const m = css.match(selectorRe);
  if (!m) throw new Error(`Block not found: ${selectorRe}`);
  const out: Tokens = {};
  for (const [, name, value] of m[1].matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) {
    out[name] = value;
  }
  return out;
}

const permafrost = parseBlock(/^:root \{([\s\S]*?)\n\}/m);
const whiteout = { ...permafrost, ...parseBlock(/^:root\[data-skin="whiteout"\] \{([\s\S]*?)\n\}/m) };

function rankOverrides(skin: "permafrost" | "whiteout"): Record<string, Tokens> {
  const re =
    skin === "permafrost"
      ? /^:root\[data-rank="([A-Z])"\] \[data-scope="app"\] \{([^}]*)\}/gm
      : /^:root\[data-skin="whiteout"\]\[data-rank="([A-Z])"\] \[data-scope="app"\] \{([^}]*)\}/gm;
  const out: Record<string, Tokens> = {};
  for (const [, rank, body] of css.matchAll(re)) {
    const t: Tokens = {};
    for (const [, n, v] of body.matchAll(/--([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})/g)) t[n] = v;
    out[rank] = t;
  }
  return out;
}

function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function ratio(a: string, b: string): number {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** [foreground, background, minimum, purpose] */
const PAIRS: [string, string, number, string][] = [
  ["frost-0", "ink-0", 4.5, "primary text"],
  ["frost-0", "ink-2", 4.5, "primary text on well"],
  ["frost-1", "ink-0", 4.5, "secondary text"],
  ["frost-1", "ink-2", 4.5, "secondary text on well"],
  ["frost-2", "ink-0", 4.5, "metadata text"],
  ["frost-2", "ink-1", 4.5, "metadata text on panel"],
  ["ember", "ink-0", 4.5, "ember text / XP chips"],
  ["ember", "ink-1", 4.5, "ember text on panel"],
  ["on-ember", "ember", 4.5, "primary button label"],
  ["glacier", "ink-1", 4.5, "cold state text"],
  ["brass", "ink-1", 4.5, "trophy / PR text"],
  ["fault", "ink-1", 4.5, "penalty text"],
  ["core", "ink-1", 4.5, "white heat numerals"],
  ["line-2", "ink-1", 1.8, "focal frame visibility"],
];

let failures = 0;
function audit(label: string, t: Tokens) {
  const rows: string[] = [];
  for (const [fg, bg, min, purpose] of PAIRS) {
    if (!t[fg] || !t[bg]) continue;
    const r = ratio(t[fg], t[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    rows.push(`  ${ok ? "pass" : "FAIL"}  ${r.toFixed(2).padStart(5)}  ${fg} on ${bg}  (${purpose}, min ${min})`);
  }
  console.log(`\n${label}\n${rows.join("\n")}`);
}

for (const [skin, base] of [["permafrost", permafrost], ["whiteout", whiteout]] as const) {
  audit(`${skin.toUpperCase()} / base (marketing)`, base);
  for (const [rank, o] of Object.entries(rankOverrides(skin))) {
    audit(`${skin.toUpperCase()} / rank ${rank}`, { ...base, ...o });
  }
}

console.log(failures ? `\n${failures} contrast failure(s).` : "\nAll contrast pairs pass WCAG AA.");
process.exit(failures ? 1 : 0);
