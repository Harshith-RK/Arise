import { chromium } from "playwright";
import sharp from "sharp";
import { writeFileSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/* ==========================================================================
   Arise icons, from the emblem's geometry: the PWA and home-screen icons, the
   browser tab icon, and the masters in brand/. Run: npm run brand-icons
   ========================================================================== */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const C = {
  ink: "#0A0D0F", frost0: "#EEF3F4", frost1: "#B9C6CB", steel: "#6E7E86", gun: "#34424A",
  line: "#3B4A54", ember: "#F2551D", emberLo: "#9E3312",
};

/* The emblem's geometry, identical to the approved square poster. */
const APEX = 30, BASE = 930, FOOT = 150, LEG = 172;
const slope = (500 - FOOT) / (BASE - APEX);
const outerL = (y) => FOOT + (BASE - y) * slope;
const merge = BASE - (500 - FOOT - LEG) / slope;
const ridge = BASE - (500 - FOOT - LEG / 2) / slope;
const mirror = (pts) => pts.map(([x, y]) => [1000 - x, y]);
const r2 = (v) => +v.toFixed(2);
const poly = (pts, fill) =>
  `<polygon points="${pts.map((p) => p.map(r2).join(",")).join(" ")}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="miter"/>`;
const legOuter = [[FOOT, BASE], [500, APEX], [500, ridge], [FOOT + LEG / 2, BASE]];
const legInner = [[FOOT + LEG / 2, BASE], [500, ridge], [500, merge], [FOOT + LEG, BASE]];
const BAR_Y = 640, BAR_H = 56, BAR_OUT = 38;
const barL = outerL(BAR_Y + BAR_H / 2) - BAR_OUT;
const barTop = [[barL, BAR_Y + BAR_H / 2], [barL + BAR_H / 2, BAR_Y], [1000 - barL - BAR_H / 2, BAR_Y], [1000 - barL, BAR_Y + BAR_H / 2]];
const barBot = [[barL, BAR_Y + BAR_H / 2], [1000 - barL, BAR_Y + BAR_H / 2], [1000 - barL - BAR_H / 2, BAR_Y + BAR_H], [barL + BAR_H / 2, BAR_Y + BAR_H]];
const F = { x0: 40, x1: 960, y0: 190, y1: BASE, ch: 110 };
const gapHalf = 500 - outerL(F.y0) + 34;
function frameLine(inset, width, color, opacity = 1) {
  const { x0, x1, y0, y1, ch } = F;
  const a = x0 + inset, b = x1 - inset, t = y0 + inset, u = y1 - inset, c = ch - inset * 0.41;
  const d = `M${r2(500 - gapHalf)} ${t} L${r2(a + c)} ${t} L${a} ${r2(t + c)} L${a} ${r2(u - c)} L${r2(a + c)} ${u} L${r2(b - c)} ${u} L${b} ${r2(u - c)} L${b} ${r2(t + c)} L${r2(b - c)} ${t} L${r2(500 + gapHalf)} ${t}`;
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="miter" opacity="${opacity}"/>`;
}
const terminals = [-1, 1].map((s) => {
  const x = r2(500 + s * gapHalf);
  return `<line x1="${x}" y1="${F.y0 - 16}" x2="${x}" y2="${F.y0 + 16}" stroke="${C.frost1}" stroke-width="5"/>`;
}).join("");
const blades = [poly(legOuter, C.frost0), poly(legInner, C.frost1), poly(mirror(legInner), C.steel), poly(mirror(legOuter), C.gun), poly(barTop, C.ember), poly(barBot, C.emberLo)].join("");
const flip = (pts) => pts.map(([x, y]) => [x, 2 * BASE + 26 - y]);
const reflectPts = flip([[FOOT, BASE], [500, APEX], [1000 - FOOT, BASE], [1000 - FOOT - LEG, BASE], [500, merge], [FOOT + LEG, BASE]]);
function reflection() {
  let y = BASE + 26, out = "";
  for (let i = 0; i < 6; i++) {
    const h = 26 - i * 3;
    out += `<rect x="0" y="${y}" width="1000" height="${h}" fill="${C.frost1}" opacity="${(0.3 * Math.pow(0.66, i)).toFixed(3)}" clip-path="url(#reflect)"/>`;
    y += h + 11;
  }
  return out;
}

/**
 * The full square emblem: ring, heat, frame, blades and shadow, on its dark
 * ground. Coordinates are the poster's, framed to the ring.
 */
function full(size, { ground = true } = {}) {
  const MID = 520, R = 640, TICK = 48;
  const span = 2 * (R + TICK) / 0.8; // ring fills 80%: the maskable safe zone
  const ox = 500 - span / 2, oy = MID - span / 2;
  const halo = Array.from({ length: 12 }, (_, i) =>
    `<circle cx="500" cy="${r2((merge + BAR_Y) / 2)}" r="${50 + i * 48}" fill="${C.ember}" opacity="0.028"/>`).join("");
  const ticks = Array.from({ length: 240 }, (_, i) => {
    const fromTop = Math.min(i, 240 - i);
    if (fromTop > 0 && fromTop <= 5) return "";
    const a = (i / 240) * Math.PI * 2 - Math.PI / 2;
    const major = i % 10 === 0, mid = i % 5 === 0;
    const len = (major ? 30 : mid ? 18 : 10) * 1.6;
    const color = i === 0 ? C.ember : major ? C.frost1 : C.line;
    // Hairlines thicken as the icon shrinks, so the bezel still reads small.
    const base = i === 0 ? 5 : major ? 3 : 1.6;
    const sw = base * Math.max(1, 512 / size) ** 0.5;
    return `<line x1="${r2(500 + R * Math.cos(a))}" y1="${r2(MID + R * Math.sin(a))}" x2="${r2(500 + (R + len) * Math.cos(a))}" y2="${r2(MID + (R + len) * Math.sin(a))}" stroke="${color}" stroke-width="${r2(sw)}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${r2(ox)} ${r2(oy)} ${r2(span)} ${r2(span)}">
  <defs><clipPath id="reflect"><polygon points="${reflectPts.map((p) => p.map(r2).join(",")).join(" ")}"/></clipPath></defs>
  ${ground ? `<rect x="${r2(ox)}" y="${r2(oy)}" width="${r2(span)}" height="${r2(span)}" fill="${C.ink}"/>` : ""}
  ${halo}
  <circle cx="500" cy="${MID}" r="${R - 14}" fill="none" stroke="${C.line}" stroke-width="1.4" opacity="0.8"/>
  ${ticks}
  ${reflection()}
  ${frameLine(0, 7, C.frost1)}${frameLine(26, 2.5, C.steel, 0.9)}${terminals}
  ${blades}
</svg>`;
}

/**
 * The same emblem for a browser tab. At 16 to 32 pixels the bezel's hairlines
 * and the shadow bands turn to grey noise, so the tab keeps what still reads
 * at that size: the forged A, its ember bar and the heat behind it.
 */
function tab(size, { ground = true } = {}) {
  // A square around the A, centred on its height (it is taller than wide).
  const side = BASE - APEX + 100;
  const vb = `${500 - side / 2} ${(APEX + BASE) / 2 - side / 2} ${side} ${side}`;
  const [vx, vy, vw] = vb.split(" ").map(Number);
  const halo = Array.from({ length: 7 }, (_, i) =>
    `<circle cx="500" cy="${r2((merge + BAR_Y) / 2)}" r="${60 + i * 60}" fill="${C.ember}" opacity="0.06"/>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${vb}">
  ${ground ? `<rect x="${vx}" y="${vy}" width="${vw}" height="${vw}" fill="${C.ink}"/>${halo}` : ""}
  ${blades}
</svg>`;
}

/* ---- render ---- */
const browser = await chromium.launch();
async function png(svg, size, path, transparent = false) {
  const p = await browser.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  await p.screenshot({ path, omitBackground: transparent, clip: { x: 0, y: 0, width: size, height: size } });
  await p.close();
  return readFileSync(path);
}

// App and home-screen icons.
await png(full(512), 512, `${ROOT}/public/icon-512.png`);
await png(full(192), 192, `${ROOT}/public/icon-192.png`);
await png(full(512), 512, `${ROOT}/public/icon-maskable-512.png`);
await png(full(180), 180, `${ROOT}/src/app/apple-icon.png`);

// Browser tab: vector, plus an .ico for browsers that ask for one.
writeFileSync(`${ROOT}/src/app/icon.svg`, tab(64) + "\n");
const icoSizes = [16, 32, 48];
const images = [];
// ICO readers require RGBA payloads. A fully opaque capture comes back as RGB,
// so the alpha channel is added back explicitly.
for (const s of icoSizes) {
  const raw = await png(tab(s), s, `${ROOT}/brand/.tab-${s}.png`);
  images.push(await sharp(raw).ensureAlpha().png().toBuffer());
}
// ICO container holding PNG payloads.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(images.length, 4);
const dir = Buffer.alloc(16 * images.length);
let offset = 6 + dir.length;
images.forEach((img, i) => {
  const s = icoSizes[i];
  dir.writeUInt8(s, i * 16); dir.writeUInt8(s, i * 16 + 1);
  dir.writeUInt8(0, i * 16 + 2); dir.writeUInt8(0, i * 16 + 3);
  dir.writeUInt16LE(1, i * 16 + 4); dir.writeUInt16LE(32, i * 16 + 6);
  dir.writeUInt32LE(img.length, i * 16 + 8); dir.writeUInt32LE(offset, i * 16 + 12);
  offset += img.length;
});
writeFileSync(`${ROOT}/src/app/favicon.ico`, Buffer.concat([header, dir, ...images]));

// Masters for the brand folder.
writeFileSync(`${ROOT}/brand/arise-emblem.svg`, full(1024) + "\n");
writeFileSync(`${ROOT}/brand/arise-mark.svg`, tab(1024, { ground: false }) + "\n");
await png(full(1024), 1024, `${ROOT}/brand/arise-emblem-1024.png`);
await png(tab(1024, { ground: false }), 1024, `${ROOT}/brand/arise-mark-transparent-1024.png`, true);
for (const s of icoSizes) rmSync(`${ROOT}/brand/.tab-${s}.png`);

await browser.close();
console.log("icons written");
