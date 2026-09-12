#!/usr/bin/env node
/**
 * slop-check: fails the build on any banned pattern from the brief (section 1).
 * Scans src/ only. Run: npm run slop-check
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = join(process.cwd(), "src");
const EXT = /\.(tsx?|jsx?|css|mdx?|json)$/;

const RULES = [
  { name: "box-shadow", re: /box-shadow/ },
  { name: "tailwind shadow utility", re: /(?<![\w-])(?:drop-|inset-|text-)?shadow-[\w[]/ },
  { name: "rounded corners", re: /(?<![\w-])rounded(?:-(?!none\b)[\w[]+)?(?![\w-])/ },
  { name: "backdrop blur / filter", re: /backdrop-(?:blur|filter)/ },
  { name: "gradient utility", re: /bg-gradient|from-\w+-\d{2,3}\s+to-/ },
  { name: "css gradient", re: /(?:linear|radial|conic)-gradient\(/ },
  { name: "stock icon pack", re: /lucide|heroicons|@tabler\/icons|react-feather|phosphor-react/ },
  { name: "banned font", re: /\b(?:Inter|Geist|Space[_ ]Grotesk|Space[_ ]Mono|Roboto|Poppins|Montserrat)\b/ },
  { name: "em dash", re: /—/ },
  { name: "en dash", re: /–/ },
  {
    name: "emoji / pictograph",
    re: /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u,
  },
  { name: "banned copy", re: /\b(?:Unlock|Elevate|Seamless(?:ly)?|Supercharge|Game-changer)\b/ },
  { name: "not-x-its-y construction", re: /\b(?:it'?s|this is) not (?:just )?(?:a |an )?\w+[,.;]\s*(?:it'?s|this is)\b/i },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) out.push(...walk(p));
    else if (EXT.test(entry)) out.push(p);
  }
  return out;
}

const hits = [];
for (const file of walk(ROOT)) {
  const lines = readFileSync(file, "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("slop-check-ignore")) return;
    for (const rule of RULES) {
      if (rule.re.test(line)) {
        hits.push(`${relative(process.cwd(), file)}:${i + 1}  [${rule.name}]  ${line.trim().slice(0, 110)}`);
      }
    }
  });
}

if (hits.length) {
  console.error(`slop-check failed with ${hits.length} hit(s):\n`);
  console.error(hits.join("\n"));
  process.exit(1);
}
console.log("slop-check passed. No banned patterns in src/.");
