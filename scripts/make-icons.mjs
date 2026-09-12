#!/usr/bin/env node
/**
 * Renders the app icons from the rank plaque geometry. Uses the Playwright
 * chromium that is already installed, so no image dependency is added.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const PLAQUE = "M50 4L90 27V73L50 96L10 73V27Z";
const TRIM = "M50 12L83 31V69L50 88L17 69V31Z";
const LETTER = "M37 31H55L63 39V61L55 69H37Z"; // rank D: kindled, the arc's first ascent

function svg({ size, maskable }) {
  const inset = maskable ? 0.72 : 1;
  const scale = inset;
  const offset = (100 - 100 * scale) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#0A0D0F"/>
  <g transform="translate(${offset} ${offset}) scale(${scale})">
    <path d="${PLAQUE}" fill="#3A1A0E"/>
    <path d="${PLAQUE}" fill="none" stroke="#F2551D" stroke-width="3" stroke-linejoin="miter"/>
    <path d="${TRIM}" fill="none" stroke="#C8A45A" stroke-width="1.5" stroke-linejoin="miter"/>
    <path d="${LETTER}" fill="none" stroke="#FFD7B5" stroke-width="7" stroke-linejoin="miter" stroke-linecap="square"/>
  </g>
</svg>`;
}

// The favicon ships as SVG; Next serves it from src/app/icon.svg.
writeFileSync("src/app/icon.svg", svg({ size: 64, maskable: false }));

const browser = await chromium.launch();
const targets = [
  { file: "public/icon-192.png", size: 192, maskable: false },
  { file: "public/icon-512.png", size: 512, maskable: false },
  { file: "public/icon-maskable-512.png", size: 512, maskable: true },
];

for (const t of targets) {
  const page = await browser.newPage({ viewport: { width: t.size, height: t.size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<body style="margin:0;background:#0A0D0F">${svg({ size: t.size, maskable: t.maskable })}</body>`,
  );
  await page.locator("svg").screenshot({ path: t.file, omitBackground: false });
  await page.close();
  console.log(`wrote ${t.file}`);
}
await browser.close();
console.log("wrote src/app/icon.svg");
