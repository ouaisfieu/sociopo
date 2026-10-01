#!/usr/bin/env node
// Contrôles après build : liens internes, JSON-LD, jeux de données, cohérence du contenu.
//   npm run build && npm run check        (STRICT=1 : les wiki-liens cassés deviennent bloquants)
import fs from "node:fs";
import path from "node:path";
import { loadCorpus } from "../lib/corpus.js";
import { THEME_BY_SLUG, KINDS, FAMILIES } from "../lib/taxonomy.js";
import site from "../src/_data/site.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "_site");
const PREFIX = site.pathPrefix; // ex. /sociopo/
const errors = [];
const warnings = [];

if (!fs.existsSync(OUT)) {
  console.error("Le dossier _site est absent : lancez d'abord « npm run build ».");
  process.exit(1);
}

function walk(dir, out = []) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, f.name);
    if (f.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(OUT);
const html = files.filter((f) => f.endsWith(".html"));
const exists = (urlPath) => {
  let p = decodeURIComponent(urlPath.split("#")[0].split("?")[0]);
  if (!p.startsWith(PREFIX)) return true; // hors site
  p = p.slice(PREFIX.length);
  const full = path.join(OUT, p);
  if (p === "" || p.endsWith("/")) return fs.existsSync(path.join(full, "index.html"));
  return fs.existsSync(full) || fs.existsSync(path.join(full, "index.html"));
};

// 1. Liens internes et JSON-LD
let links = 0;
let ldBlocks = 0;
const brokenLinks = new Map();
for (const file of html) {
  const src = fs.readFileSync(file, "utf8");
  const rel = path.relative(OUT, file);
  for (const m of src.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|mailto:|data:|#|javascript:)/.test(u)) continue;
    links++;
    if (!u.startsWith("/")) continue;
    if (!exists(u)) {
      if (!brokenLinks.has(u)) brokenLinks.set(u, new Set());
      brokenLinks.get(u).add(rel);
    }
  }
  const lds = [...src.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (!lds.length && !rel.startsWith("404")) warnings.push(`${rel} : aucune donnée JSON-LD`);
  for (const [, json] of lds) {
    ldBlocks++;
    try {
      const d = JSON.parse(json);
      if (d["@context"] !== "https://schema.org") errors.push(`${rel} : @context JSON-LD inattendu`);
      const graph = d["@graph"] || [d];
      const ids = new Set();
      for (const n of graph) {
        if (!n["@type"]) errors.push(`${rel} : nœud JSON-LD sans @type`);
        if (n["@id"]) {
          if (ids.has(n["@id"])) errors.push(`${rel} : @id dupliqué ${n["@id"]}`);
          ids.add(n["@id"]);
        }
      }
    } catch (e) {
      errors.push(`${rel} : JSON-LD invalide (${e.message})`);
    }
  }
  if (!/<title>[^<]{5,}<\/title>/.test(src)) errors.push(`${rel} : <title> absent ou trop court`);
  if (!/<meta name="description" content="[^"]{30,}/.test(src) && !rel.startsWith("404")) warnings.push(`${rel} : meta description courte`);
  const h1 = (src.match(/<h1[\s>]/g) || []).length;
  if (h1 !== 1) warnings.push(`${rel} : ${h1} titre(s) h1`);
}
for (const [u, from] of brokenLinks) errors.push(`Lien interne cassé ${u} (dans ${[...from].slice(0, 3).join(", ")}${from.size > 3 ? "…" : ""})`);

// 2. Jeux de données
for (const f of files.filter((f) => f.endsWith(".json") || f.endsWith(".jsonld") || f.endsWith(".webmanifest"))) {
  try {
    JSON.parse(fs.readFileSync(f, "utf8"));
  } catch (e) {
    errors.push(`${path.relative(OUT, f)} : JSON invalide`);
  }
}
for (const f of ["sitemap.xml", "feed.xml", "robots.txt", "llms.txt", "llms-full.txt", "thesaurus.ttl", "opensearch.xml", "sw.js", "manifest.webmanifest"]) {
  if (!fs.existsSync(path.join(OUT, f))) errors.push(`Fichier attendu absent : ${f}`);
}

// 3. Contenu
const corpus = loadCorpus({ force: true });
for (const e of corpus.all) {
  if (!["notion", "parti", "personne", "dossier"].includes(e.type)) continue;
  if (!e.summary || e.summary.length < 40) warnings.push(`${e.slug} : résumé absent ou très court`);
  for (const t of e.themes || []) if (!THEME_BY_SLUG[t]) errors.push(`${e.slug} : thème inconnu « ${t} »`);
  if (e.type === "notion") {
    if (!KINDS[e.kind]) errors.push(`${e.slug} : nature inconnue « ${e.kind} »`);
    if (![1, 2, 3].includes(e.level)) warnings.push(`${e.slug} : niveau de lecture absent`);
    if (!e.terms || !e.terms.nl) warnings.push(`${e.slug} : terme néerlandais absent`);
  }
  if (e.type === "parti" && e.data.family && !FAMILIES[e.data.family]) errors.push(`${e.slug} : famille inconnue « ${e.data.family} »`);
}
for (const p of corpus.problems) warnings.push(p.message);
const missing = [...new Set(corpus.broken.map((b) => b.to))];
const msg = `${corpus.broken.length} wiki-lien(s) vers ${missing.length} notice(s) encore absente(s)`;
if (missing.length) (process.env.STRICT === "1" ? errors : warnings).push(`${msg} : ${missing.slice(0, 40).join(", ")}${missing.length > 40 ? "…" : ""}`);

// Rapport
console.log(`Pages HTML : ${html.length} · liens internes vérifiés : ${links} · blocs JSON-LD : ${ldBlocks} · entrées : ${corpus.all.length}`);
if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`);
  for (const w of warnings.slice(0, 60)) console.log(`  · ${w}`);
  if (warnings.length > 60) console.log(`  … et ${warnings.length - 60} autres`);
}
if (errors.length) {
  console.error(`\n${errors.length} erreur(s) :`);
  for (const e of errors.slice(0, 80)) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\nContrôles réussis.");
