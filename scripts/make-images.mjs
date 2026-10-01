#!/usr/bin/env node
// Génère les icônes et les images de partage (Open Graph) dans src/assets/img/.
// Outil facultatif, à lancer après modification de la charte : il requiert Playwright
//   npm i -D playwright && npx playwright install chromium && node scripts/make-images.mjs
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";
import { THEMES } from "../lib/taxonomy.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "src/assets/img");
const FONTS = path.join(ROOT, "node_modules/@fontsource-variable");
const sprite = fs.readFileSync(path.join(ROOT, "src/_includes/partials/icons.njk"), "utf8");
const symbol = (id) => {
  const m = sprite.match(new RegExp(`<symbol id="i-${id}" viewBox="([^"]+)">([\\s\\S]*?)</symbol>`));
  return m ? { viewBox: m[1], body: m[2] } : null;
};
const LOGO = symbol("logo");
const svgIcon = (id, color, size) => {
  const s = symbol(id) || LOGO;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox}" width="${size}" height="${size}" style="color:${color}">${s.body}</svg>`;
};

const b64 = (f) => fs.readFileSync(path.join(FONTS, f)).toString("base64");
const css = `
@font-face { font-family: "OgSerif"; src: url(data:font/woff2;base64,${b64("source-serif-4/files/source-serif-4-latin-wght-normal.woff2")}) format("woff2"); font-weight: 200 900; }
@font-face { font-family: "OgSans"; src: url(data:font/woff2;base64,${b64("inter/files/inter-latin-wght-normal.woff2")}) format("woff2"); font-weight: 100 900; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; overflow: hidden; }
.og { position: relative; width: 1200px; height: 630px; background: #fbfaf6; color: #17181b; padding: 64px 72px; font-family: "OgSans"; display: flex; flex-direction: column; justify-content: space-between; }
.og::after { content: ""; position: absolute; inset: auto 0 0 0; height: 14px; background: linear-gradient(90deg, #1f3a63 0 33%, #b23b28 33% 66%, #c7a03c 66%); }
.brand { display: flex; align-items: center; gap: 18px; font-family: "OgSerif"; font-weight: 700; font-size: 40px; }
.brand small { display: block; font-family: "OgSans"; font-size: 18px; font-weight: 500; color: #6b6a64; letter-spacing: .02em; }
.eyebrow { font-size: 24px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; color: #b23b28; margin-bottom: 18px; }
h1 { font-family: "OgSerif"; font-size: 78px; line-height: 1.04; font-weight: 750; max-width: 900px; letter-spacing: -0.01em; }
p.sub { font-size: 28px; line-height: 1.35; color: #3d3e42; max-width: 860px; margin-top: 18px; }
.deco { position: absolute; right: -60px; top: 70px; opacity: .1; }
.ico { position: absolute; right: 80px; top: 64px; width: 120px; height: 120px; border-radius: 28px; background: #e8eef7; display: grid; place-items: center; }
`;

function ogHtml({ eyebrow, title, sub, icon }) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body><div class="og">
  <div class="deco">${svgIcon("logo", "#1f3a63", 560)}</div>
  <div class="brand">${svgIcon("logo", "#b23b28", 64)}<div>Sociopo<small>encyclopédie de la sociopolitique belge</small></div></div>
  <div><p class="eyebrow">${eyebrow}</p><h1>${title}</h1>${sub ? `<p class="sub">${sub}</p>` : ""}</div>
  </div></body></html>`;
}

function iconHtml(size, { pad = 0.14, bg = "#fbfaf6", radius = 0.22 } = {}) {
  const inner = Math.round(size * (1 - pad * 2));
  return `<!doctype html><html><head><style>*{margin:0}body{width:${size}px;height:${size}px;background:transparent}div{width:${size}px;height:${size}px;border-radius:${Math.round(size * radius)}px;background:${bg};display:grid;place-items:center}</style></head><body><div>${svgIcon("logo", "#b23b28", inner)}</div></body></html>`;
}

const SECTIONS = [
  { file: "default", eyebrow: "Encyclopédie libre", title: "La politique belge, enfin lisible", sub: "Institutions, fédéralisme, partis, élections, piliers, concertation sociale — en notices reliées, jeux et données ouvertes." },
  { file: "partis", eyebrow: "Partis politiques", title: "Les partis belges, d'hier et d'aujourd'hui", sub: "Familles, scissions, résultats et dirigeants.", icon: "flag" },
  { file: "personnalites", eyebrow: "Personnalités", title: "Les figures de la vie politique belge", sub: "Rois, Premiers ministres, présidents de parti, ministres-présidents.", icon: "users" },
  { file: "dossiers", eyebrow: "Dossiers d'analyse", title: "Les rapports de forces, décryptés", sub: "Lectures contradictoires, faits établis, sources.", icon: "folder" },
  { file: "jouer", eyebrow: "Jouer & comprendre", title: "Former une coalition, répartir les sièges, situer une compétence", sub: "Simulateurs, quiz, cartes mémoire, jeu du formateur.", icon: "dice" },
  { file: "gouvernements", eyebrow: "Gouvernements", title: "Tous les gouvernements depuis 1945", sub: "Coalitions, Premiers ministres et ministres-présidents, durées de formation.", icon: "users" },
  { file: "lexique", eyebrow: "Lexique A–Z", title: "Le vocabulaire politique belge", sub: "Avec les termes officiels en néerlandais, en allemand et en anglais.", icon: "book" },
];

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
const shot = async (html, file, w = 1200, h = 630, transparent = false) => {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: file, omitBackground: transparent });
};
fs.mkdirSync(path.join(OUT, "og"), { recursive: true });
for (const s of SECTIONS) await shot(ogHtml(s), path.join(OUT, "og", `${s.file}.png`));
const firstSentence = (txt = "") => {
  const m = txt.match(/^(.{40,170}?[.!?])\s/);
  return m ? m[1] : txt.length > 170 ? `${txt.slice(0, 167)}…` : txt;
};
for (const t of THEMES) await shot(ogHtml({ eyebrow: "Thème", title: t.label, sub: firstSentence(t.intro) }), path.join(OUT, "og", `${t.slug}.png`));
// Icônes
await shot(iconHtml(32, { pad: 0.04, bg: "transparent", radius: 0 }), path.join(OUT, "favicon-32.png"), 32, 32, true);
await shot(iconHtml(180, { pad: 0.16 }), path.join(OUT, "apple-touch-icon.png"), 180, 180);
await shot(iconHtml(192), path.join(OUT, "icon-192.png"), 192, 192, true);
await shot(iconHtml(512), path.join(OUT, "logo-512.png"), 512, 512, true);
await shot(iconHtml(512, { pad: 0.24, radius: 0 }), path.join(OUT, "icon-maskable-512.png"), 512, 512);
await browser.close();
// Favicon SVG (s'adapte au thème sombre)
fs.writeFileSync(
  path.join(OUT, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LOGO.viewBox}"><style>svg{color:#b23b28}@media (prefers-color-scheme:dark){svg{color:#f08f75}}</style>${LOGO.body}</svg>\n`,
);
console.log("Images générées dans", path.relative(ROOT, OUT));
