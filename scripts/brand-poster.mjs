import { chromium } from "playwright";
import { rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ==========================================================================
   Arise logo posters for social media: 4:5 with the name, square without.
   Run: npm run brand-poster
   ========================================================================== */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONTS = `${ROOT}/.agents/skills/canvas-design/canvas-fonts`;
const OUT = `${ROOT}/brand`;
const WORD_FONT = process.argv[2] ?? "Boldonse-Regular";
const suffix = process.argv[3] ?? "";

const C = {
  ink: "#0A0D0F",
  frost0: "#EEF3F4",
  frost1: "#B9C6CB",
  steel: "#6E7E86",
  gun: "#34424A",
  line: "#3B4A54",
  ember: "#F2551D",
  emberHi: "#FF7A3D",
  emberLo: "#9E3312",
};

/* ------------------------------------------------------------------ mark
   A 1000-unit box. The A is two faceted blades that meet at a point which
   rises through the top of an octagonal frame. */
const APEX = 30, BASE = 930, FOOT = 150, LEG = 172;
const slope = (500 - FOOT) / (BASE - APEX); // horizontal run per unit of rise
const outerL = (y) => FOOT + (BASE - y) * slope;
const merge = BASE - (500 - FOOT - LEG) / slope; // where the inside edges meet
const ridge = BASE - (500 - FOOT - LEG / 2) / slope; // where each leg's ridge reaches the axis
const mirror = (pts) => pts.map(([x, y]) => [1000 - x, y]);
// Each facet is stroked in its own colour so neighbouring facets meet without an anti-aliased seam.
const poly = (pts, fill, extra = "") =>
  `<polygon points="${pts.map((p) => p.map((v) => +v.toFixed(2)).join(",")).join(" ")}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="miter" ${extra}/>`;

const legOuter = [[FOOT, BASE], [500, APEX], [500, ridge], [FOOT + LEG / 2, BASE]];
const legInner = [[FOOT + LEG / 2, BASE], [500, ridge], [500, merge], [FOOT + LEG, BASE]];

// Crossbar: a chamfered bar that reaches past the blades like a guard.
const BAR_Y = 640, BAR_H = 56, BAR_OUT = 38;
const barL = outerL(BAR_Y + BAR_H / 2) - BAR_OUT;
const barTop = [[barL, BAR_Y + BAR_H / 2], [barL + BAR_H / 2, BAR_Y], [1000 - barL - BAR_H / 2, BAR_Y], [1000 - barL, BAR_Y + BAR_H / 2]];
const barBot = [[barL, BAR_Y + BAR_H / 2], [1000 - barL, BAR_Y + BAR_H / 2], [1000 - barL - BAR_H / 2, BAR_Y + BAR_H], [barL + BAR_H / 2, BAR_Y + BAR_H]];

// Frame: an octagon the apex breaks through.
const F = { x0: 40, x1: 960, y0: 190, y1: BASE, ch: 110 };
const gapHalf = (500 - outerL(F.y0)) + 34;
const frameLine = (inset, width, color, opacity = 1) => {
  const { x0, x1, y0, y1, ch } = F;
  const a = x0 + inset, b = x1 - inset, t = y0 + inset, u = y1 - inset, c = ch - inset * 0.41;
  // Drawn as one open path starting and ending at the gap, so the break is clean.
  const d = `M${500 - gapHalf} ${t} L${a + c} ${t} L${a} ${t + c} L${a} ${u - c} L${a + c} ${u} L${b - c} ${u} L${b} ${u - c} L${b} ${t + c} L${b - c} ${t} L${500 + gapHalf} ${t}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="miter" stroke-linecap="butt" opacity="${opacity}"/>`;
};
// Short terminals where the frame stops either side of the apex.
const terminals = [-1, 1].map((s) => {
  const x = 500 + s * gapHalf;
  return `<line x1="${x}" y1="${F.y0 - 16}" x2="${x}" y2="${F.y0 + 16}" stroke="${C.frost1}" stroke-width="5"/>`;
}).join("");

const markInner = [
  frameLine(0, 7, C.frost1),
  frameLine(26, 2.5, C.steel, 0.9),
  terminals,
  poly(legOuter, C.frost0),
  poly(legInner, C.frost1),
  poly(mirror(legInner), C.steel),
  poly(mirror(legOuter), C.gun),
  poly(barTop, C.ember),
  poly(barBot, C.emberLo),
].join("");

/* Reflection: the blades again, upside down, in bands that thin and dim. */
function reflection() {
  const bands = [];
  let y = BASE + 26;
  const rows = 6;
  for (let i = 0; i < rows; i++) {
    const h = 26 - i * 3;
    const op = 0.3 * Math.pow(0.66, i);
    bands.push(`<rect x="0" y="${y}" width="1000" height="${h}" fill="${C.frost1}" opacity="${op.toFixed(3)}" clip-path="url(#reflect)"/>`);
    y += h + 11;
  }
  return bands.join("");
}
const reflectShape = [...legOuter, ...legInner].length && (() => {
  const flip = (pts) => pts.map(([x, yy]) => [x, 2 * BASE + 26 - yy]);
  const L = flip([[FOOT, BASE], [500, APEX], [1000 - FOOT, BASE], [1000 - FOOT - LEG, BASE], [500, merge], [FOOT + LEG, BASE]]);
  return `<clipPath id="reflect"><polygon points="${L.map((p) => p.join(",")).join(" ")}"/></clipPath>`;
})();

/* ------------------------------------------------------------------ page */
function page(w, h, withWord = true) {
  const square = h === w;
  // Without the word the emblem has the whole canvas, so it can grow.
  const S = (w * (withWord ? (square ? 0.47 : 0.5) : 0.55)) / 1000; // px per mark unit
  const cx = w / 2;
  const MID = 520;          // emblem's centre, in mark units
  const R = 640 * S;        // bezel radius
  const TICK = 48 * S;      // longest graduation
  const capH = 112 * S;
  const wordGap = 120 * S;
  const groupH = 2 * (R + TICK) + (withWord ? wordGap + capH : 0);
  const ringCy = (h - groupH) / 2 + R + TICK;
  const tx = cx - 500 * S, ty = ringCy - MID * S;
  const coreX = cx, coreY = ty + (merge + BAR_Y) / 2 * S; // the counter, where the heat shows through
  // Stepped ember radiance behind the core.
  const halo = Array.from({ length: 12 }, (_, i) => {
    const r = (50 + i * 48) * S;
    return `<circle cx="${coreX}" cy="${coreY}" r="${r.toFixed(1)}" fill="${C.ember}" opacity="0.028"/>`;
  }).join("");

  // Bezel: 240 hairline graduations, every tenth long, the one at the top in ember.
  const ticks = Array.from({ length: 240 }, (_, i) => {
    const a = (i / 240) * Math.PI * 2 - Math.PI / 2;
    const major = i % 10 === 0;
    const mid = i % 5 === 0;
    const len = (major ? 30 : mid ? 18 : 10) * S * 1.6;
    const r0 = R, r1 = R + len;
    // Leave the arc the apex rises through clear.
    const fromTop = Math.min(i, 240 - i);
    if (fromTop > 0 && fromTop <= 5) return "";
    const color = i === 0 ? C.ember : major ? C.frost1 : C.line;
    const sw = i === 0 ? 5 : major ? 3 : 1.6;
    return `<line x1="${(cx + r0 * Math.cos(a)).toFixed(2)}" y1="${(ringCy + r0 * Math.sin(a)).toFixed(2)}" x2="${(cx + r1 * Math.cos(a)).toFixed(2)}" y2="${(ringCy + r1 * Math.sin(a)).toFixed(2)}" stroke="${color}" stroke-width="${sw}"/>`;
  }).join("");
  const ring = `<circle cx="${cx}" cy="${ringCy}" r="${R - 14 * S}" fill="none" stroke="${C.line}" stroke-width="1.4" opacity="0.8"/>`;

  const wordY = ringCy + R + TICK + wordGap + capH;
  const wordW = 760 * S;

  return `<!doctype html><html><head><style>
  @font-face { font-family: Word; src: url("file://${FONTS}/${WORD_FONT}.ttf"); }
  html,body { margin:0; background:${C.ink}; }
  svg { display:block; }
  </style></head><body>
  <svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <filter id="grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/>
        <feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.94  0 0 0 0 0.95  0 0 0 0.9 0"/>
      </filter>
      ${reflectShape}
    </defs>
    <rect width="${w}" height="${h}" fill="${C.ink}"/>
    ${halo}
    ${ring}
    ${ticks}
    <g transform="translate(${tx} ${ty}) scale(${S})">
      ${reflection()}
      ${markInner}
    </g>
    ${withWord ? "" : "<!--"}<text x="${cx}" y="${wordY}" text-anchor="middle" font-family="Word" font-size="${capH / 0.72}"
      fill="${C.frost0}" textLength="${wordW}" lengthAdjust="spacing">ARISE</text>${withWord ? "" : "-->"}
    <rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.05"/>
  </svg></body></html>`;
}

const browser = await chromium.launch();
for (const [w, h, name, withWord] of [[2160, 2700, "arise-logo-poster", true], [2160, 2160, "arise-logo-poster-square", false]]) {
  const file = `${OUT}/.${name}.html`;
  writeFileSync(file, page(w, h, withWord));
  const p = await browser.newPage({ viewport: { width: w, height: h } });
  await p.goto(`file://${file}`);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/${name}${suffix}.png` });
  await p.close();
  rmSync(file);
}
await browser.close();
console.log("rendered", WORD_FONT);
