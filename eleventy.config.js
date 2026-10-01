// Configuration Eleventy 3 — Sociopo
import path from "node:path";
import fs from "node:fs";
import { HtmlBasePlugin } from "@11ty/eleventy";
import * as esbuild from "esbuild";

import site from "./src/_data/site.js";
import { loadCorpus, previewIndex, graphData, abecedaire } from "./lib/corpus.js";
import { createMarkdown } from "./lib/markdown.js";
import { THEMES, THEME_BY_SLUG, KINDS, FAMILIES } from "./lib/taxonomy.js";
import * as LD from "./lib/jsonld.js";
import { crumbsFor, jsonLdFor } from "./lib/pagedata.js";
import { hemicycleSvg } from "./lib/hemicycle.js";
import { DATASETS } from "./lib/opendata.js";
import {
  dateFr, yearOf, numFr, truncate, plainText, readingTime, compareFr, slugify, hashString, escapeHtml, daysBetween,
} from "./lib/utils.js";

let corpus = loadCorpus({ force: true });
const brokenSeen = new Set();

// Objet stable transmis au moteur Markdown (le corpus est rechargé à chaque build).
const corpusProxy = { get: (slug) => corpus.get(slug) };
const corpusProxyFull = {
  get: (slug) => corpus.get(slug),
  ofType: (t) => corpus.ofType(t),
  ofTheme: (t) => corpus.ofTheme(t),
  get all() { return corpus.all; },
};
const md = createMarkdown(corpusProxy, { onBroken: (s) => brokenSeen.add(s) });

async function buildAssets(outDir) {
  const jsDir = "src/assets/js";
  const entryPoints = fs
    .readdirSync(jsDir)
    .filter((f) => f.endsWith(".js") && !f.startsWith("_"))
    .map((f) => path.join(jsDir, f));
  await esbuild.build({
    entryPoints,
    bundle: true,
    format: "esm",
    splitting: true,
    chunkNames: "chunks/[name]-[hash]",
    minify: true,
    sourcemap: false,
    target: ["es2020"],
    outdir: path.join(outDir, "assets/js"),
    logLevel: "warning",
  });
  await esbuild.build({
    entryPoints: ["src/assets/css/main.css", "src/assets/css/print.css"],
    bundle: true,
    minify: true,
    external: ["*.woff2", "*.svg", "*.png"],
    outdir: path.join(outDir, "assets/css"),
    logLevel: "warning",
  });
}


// ——— Nœuds JSON-LD complémentaires pour les pages d'outils et de données
const QUIZ = JSON.parse(fs.readFileSync("./src/_data/quiz.json", "utf8"));
function extraNodes(kind, pageUrl) {
  if (!kind) return [];
  const abs = (u) => LD.absUrl(site, u);
  const pageId = abs(pageUrl);
  const app = (name, desc, extra = {}) => ({
    "@type": "WebApplication",
    "@id": `${pageId}#app`,
    name,
    description: desc,
    url: pageId,
    applicationCategory: "EducationalApplication",
    operatingSystem: "Tout navigateur web récent",
    isAccessibleForFree: true,
    inLanguage: site.lang,
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    publisher: { "@id": abs("/#editeur") },
    about: { "@id": abs("/#belgique") },
    ...extra,
  });
  if (kind === "quiz") {
    return [
      app("Quiz de sociopolitique belge", "Quiz à choix multiples sur les institutions, les partis, les élections et l'histoire politique belges."),
      {
        "@type": "Quiz",
        "@id": `${pageId}#quiz`,
        name: "Quiz de sociopolitique belge — questions rédigées",
        inLanguage: site.lang,
        educationalLevel: "Enseignement secondaire supérieur et grand public",
        license: site.license.url,
        about: [{ "@id": abs("/#belgique") }, { "@type": "Thing", name: "Politique en Belgique" }],
        hasPart: QUIZ.items.slice(0, 60).map((q) => ({
          "@type": "Question",
          eduQuestionType: "Multiple choice",
          text: q.q,
          acceptedAnswer: { "@type": "Answer", text: q.c[q.a], ...(q.x ? { answerExplanation: { "@type": "Comment", text: q.x } } : {}) },
          suggestedAnswer: q.c.filter((_, i) => i !== q.a).map((t) => ({ "@type": "Answer", text: t })),
        })),
      },
    ];
  }
  if (kind === "flashcards") {
    const notions = corpus.ofType("notion").filter((n) => n.level === 1).slice(0, 80);
    return [
      app("Cartes mémoire de sociopolitique belge", "Révision par répétition espacée des notions de la politique belge, en français, néerlandais, allemand et anglais."),
      {
        "@type": "Quiz",
        "@id": `${pageId}#cartes`,
        name: "Cartes mémoire — notions essentielles",
        inLanguage: site.lang,
        license: site.license.url,
        hasPart: notions.map((n) => ({
          "@type": "Question",
          eduQuestionType: "Flashcard",
          text: n.title,
          acceptedAnswer: { "@type": "Answer", text: n.summary },
        })),
      },
    ];
  }
  if (kind === "datasets") {
    return [
      {
        "@type": "DataCatalog",
        "@id": `${pageId}#catalogue`,
        name: "Données ouvertes de Sociopo",
        description: "Jeux de données ouverts sur la sociopolitique belge, publiés au format JSON sous licence CC BY 4.0.",
        url: pageId,
        inLanguage: site.lang,
        license: site.license.url,
        publisher: { "@id": abs("/#editeur") },
        dataset: DATASETS.map((d) => ({
          "@type": "Dataset",
          "@id": abs(`/data/${d.name}.json#dataset`),
          name: `Sociopo — ${d.title}`,
          description: d.description,
          license: site.license.url,
          isAccessibleForFree: true,
          creator: { "@id": abs("/#editeur") },
          dateModified: site.updated,
          spatialCoverage: { "@type": "Place", name: "Belgique", sameAs: "https://www.wikidata.org/wiki/Q31" },
          inLanguage: site.lang,
          distribution: [{ "@type": "DataDownload", encodingFormat: "application/json", contentUrl: abs(`/data/${d.name}.json`) }],
        })),
      },
      {
        "@type": "Dataset",
        "@id": abs("/thesaurus.ttl#dataset"),
        name: "Sociopo — Thésaurus SKOS de la sociopolitique belge",
        description: "Vocabulaire contrôlé (SKOS) des notions de la politique belge, avec libellés en français, néerlandais, allemand et anglais.",
        license: site.license.url,
        isAccessibleForFree: true,
        creator: { "@id": abs("/#editeur") },
        dateModified: site.updated,
        distribution: [
          { "@type": "DataDownload", encodingFormat: "text/turtle", contentUrl: abs("/thesaurus.ttl") },
          { "@type": "DataDownload", encodingFormat: "application/ld+json", contentUrl: abs("/thesaurus.jsonld") },
        ],
      },
    ];
  }
  if (kind.startsWith("app:")) {
    const [, name, desc] = kind.split("|");
    return [app(name, desc)];
  }
  return [];
}

export default async function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);
  eleventyConfig.setLibrary("md", md);
  eleventyConfig.setQuietMode(true);

  // ——— Rechargement du corpus et compilation des assets avant chaque build
  eleventyConfig.on("eleventy.before", async ({ directories }) => {
    corpus = loadCorpus({ force: true });
    brokenSeen.clear();
    await buildAssets(directories.output);
  });
  eleventyConfig.on("eleventy.after", () => {
    const { broken, problems, all } = corpus;
    const counts = all.reduce((acc, e) => ((acc[e.type] = (acc[e.type] || 0) + 1), acc), {});
    console.log(`[sociopo] Corpus : ${all.length} entrées`, counts);
    if (problems.length) {
      console.warn(`[sociopo] ${problems.length} problème(s) de contenu :`);
      for (const p of problems.slice(0, 50)) console.warn(`  - ${p.message}`);
    }
    if (broken.length) {
      const uniq = [...new Set(broken.map((b) => b.to))];
      console.warn(`[sociopo] ${broken.length} wiki-lien(s) vers ${uniq.length} notice(s) absente(s) : ${uniq.slice(0, 80).join(", ")}`);
      if (process.env.STRICT === "1") throw new Error("Wiki-liens cassés (STRICT=1)");
    }
  });
  eleventyConfig.addWatchTarget("./src/assets/");
  eleventyConfig.addWatchTarget("./lib/");

  // ——— Fichiers statiques
  eleventyConfig.addPassthroughCopy({ "src/assets/img": "assets/img" });
  eleventyConfig.addPassthroughCopy({ "src/static": "/" });
  const fontFiles = {
    "node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2": "assets/fonts/source-serif-4-latin-wght-normal.woff2",
    "node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2": "assets/fonts/source-serif-4-latin-ext-wght-normal.woff2",
    "node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2": "assets/fonts/source-serif-4-latin-wght-italic.woff2",
    "node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-italic.woff2": "assets/fonts/source-serif-4-latin-ext-wght-italic.woff2",
    "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2": "assets/fonts/inter-latin-wght-normal.woff2",
    "node_modules/@fontsource-variable/inter/files/inter-latin-ext-wght-normal.woff2": "assets/fonts/inter-latin-ext-wght-normal.woff2",
  };
  eleventyConfig.addPassthroughCopy(fontFiles);

  // ——— Données globales calculées
  eleventyConfig.addGlobalData("corpus", () => ({
    all: corpus.all,
    count: corpus.all.length,
    notions: corpus.ofType("notion"),
    partis: corpus.ofType("parti"),
    personnes: corpus.ofType("personne"),
    dossiers: corpus.ofType("dossier"),
    gouvernements: corpus.ofType("gouvernement"),
    elections: corpus.ofType("election"),
    broken: corpus.broken,
  }));
  eleventyConfig.addGlobalData("taxonomy", () => ({ THEMES, THEME_BY_SLUG, KINDS, FAMILIES }));
  eleventyConfig.addGlobalData("datasets", () => DATASETS);

  // ——— Filtres : corpus
  eleventyConfig.addFilter("entry", (slug) => corpus.get(slug));
  eleventyConfig.addFilter("entries", (slugs = []) => (slugs || []).map((s) => corpus.get(s)).filter(Boolean));
  eleventyConfig.addFilter("ofTheme", (theme) => corpus.ofTheme(theme));
  eleventyConfig.addFilter("ofType", (type) => corpus.ofType(type));
  eleventyConfig.addFilter("ofKind", (arr, kind) => (arr || []).filter((e) => e.kind === kind));
  eleventyConfig.addFilter("withTheme", (arr, theme) => (arr || []).filter((e) => (e.themes || []).includes(theme)));
  eleventyConfig.addFilter("abecedaire", (arr) => abecedaire(arr || []));
  eleventyConfig.addFilter("kindLabel", (k) => (KINDS[k] || {}).label || "");
  eleventyConfig.addFilter("kindPlural", (k) => (KINDS[k] || {}).plural || "");
  eleventyConfig.addFilter("theme", (slug) => THEME_BY_SLUG[slug]);
  eleventyConfig.addFilter("familyLabel", (f) => (FAMILIES[f] || {}).label || f || "");
  eleventyConfig.addFilter("sortTitle", (arr) => [...(arr || [])].sort((a, b) => compareFr(a.title, b.title)));
  eleventyConfig.addFilter("sortBy", (arr, key, dir = "asc") => {
    const out = [...(arr || [])].sort((a, b) => {
      const va = key.split(".").reduce((o, k) => (o ? o[k] : undefined), a);
      const vb = key.split(".").reduce((o, k) => (o ? o[k] : undefined), b);
      if (va === vb) return 0;
      if (va === undefined || va === null) return 1;
      if (vb === undefined || vb === null) return -1;
      return va < vb ? -1 : 1;
    });
    return dir === "desc" ? out.reverse() : out;
  });
  eleventyConfig.addFilter("where", (arr, key, value) =>
    (arr || []).filter((x) => key.split(".").reduce((o, k) => (o ? o[k] : undefined), x) === value),
  );
  eleventyConfig.addFilter("whereIn", (arr, key, values = []) =>
    (arr || []).filter((x) => values.includes(key.split(".").reduce((o, k) => (o ? o[k] : undefined), x))),
  );
  eleventyConfig.addFilter("limit", (arr, n) => (arr || []).slice(0, n));
  eleventyConfig.addFilter("activeGov", (arr) => (arr || []).filter((g) => !g.end));
  eleventyConfig.addFilter("pluck", (arr, key) => (arr || []).map((x) => x[key]));
  eleventyConfig.addFilter("relatedOf", (entry, n = 8) => {
    if (!entry) return [];
    const scores = new Map();
    const bump = (s, v) => scores.set(s, (scores.get(s) || 0) + v);
    for (const s of entry.relatedValid || []) bump(s, 10);
    for (const s of entry.links || []) bump(s, 3);
    for (const s of entry.backlinks || []) bump(s, 2);
    scores.delete(entry.slug);
    return [...scores.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([s]) => corpus.get(s))
      .filter(Boolean)
      .slice(0, n);
  });
  eleventyConfig.addFilter("sameThemeOf", (entry, n = 6) => {
    if (!entry || !entry.themes || !entry.themes.length) return [];
    const exclude = new Set([entry.slug, ...(entry.relatedValid || []), ...(entry.links || [])]);
    const pool = corpus.ofTheme(entry.themes[0]).filter((e) => !exclude.has(e.slug) && e.type === "notion");
    const h = hashString(entry.slug);
    const out = [];
    for (let i = 0; i < pool.length && out.length < n; i++) out.push(pool[(h + i * 7) % pool.length]);
    return [...new Set(out)];
  });
  eleventyConfig.addFilter("dailyPick", (arr, salt = "") => {
    if (!arr || !arr.length) return null;
    const d = new Date().toISOString().slice(0, 10);
    return arr[hashString(d + salt) % arr.length];
  });

  // ——— Filtres : texte, dates, nombres
  eleventyConfig.addFilter("dateFr", (v, short) => dateFr(v, { short: !!short }));
  eleventyConfig.addFilter("year", (v) => yearOf(v));
  eleventyConfig.addFilter("num", (v, d) => numFr(v, d));
  eleventyConfig.addFilter("pct", (v, d = 1) => (v === null || v === undefined ? "" : `${numFr(v, d)} %`));
  eleventyConfig.addFilter("truncate", (s, n = 160) => truncate(s, n));
  eleventyConfig.addFilter("plain", (s) => plainText(s));
  eleventyConfig.addFilter("readingTime", (s) => readingTime(s));
  eleventyConfig.addFilter("slugify", (s) => slugify(s));
  eleventyConfig.addFilter("esc", (s) => escapeHtml(s));
  eleventyConfig.addFilter("days", (a, b) => (a && b ? daysBetween(a, b) : null));
  eleventyConfig.addFilter("md", (s) => (s ? md.render(String(s)) : ""));
  eleventyConfig.addFilter("mdInline", (s) => (s ? md.renderInline(String(s)) : ""));
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));
  eleventyConfig.addFilter("jsonScript", (v) => JSON.stringify(v).replace(/</g, "\\u003c"));
  eleventyConfig.addFilter("absUrl", (p) => LD.absUrl(site, p));
  eleventyConfig.addFilter("tocFromHtml", (html = "") => {
    const toc = [];
    const re = /<h([23])[^>]*\sid="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/g;
    let m;
    while ((m = re.exec(html))) toc.push({ level: Number(m[1]), id: m[2], text: m[3].replace(/<[^>]+>/g, "") });
    return toc;
  });
  eleventyConfig.addFilter("initial", (s) => {
    const c = String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").charAt(0).toUpperCase();
    return /[A-Z]/.test(c) ? c : "#";
  });
  eleventyConfig.addFilter("sum", (arr, key) => (arr || []).reduce((acc, x) => acc + (Number(key ? x[key] : x) || 0), 0));
  eleventyConfig.addFilter("keys", (o) => Object.keys(o || {}));
  eleventyConfig.addFilter("entriesOf", (o) => Object.entries(o || {}));

  // ——— Filtres : JSON-LD
  eleventyConfig.addFilter("crumbs", (entry) => (entry ? crumbsFor(entry) : []));
  eleventyConfig.addFilter("ldNotice", (entry) => (entry ? jsonLdFor(entry) : ""));
  eleventyConfig.addFilter("ldGovernment", (g, url) => {
    const ent = LD.governmentNode(site, g, corpus, url);
    const crumbs = [{ label: "Accueil", url: "/" }, { label: "Gouvernements", url: "/gouvernements/" }, { label: g.name, url }];
    return JSON.stringify(LD.entityGraph(site, { url, title: g.name, description: g.summary, crumbs, entity: ent })).replace(/</g, "\\u003c");
  });
  eleventyConfig.addFilter("ldElection", (el, url) => {
    const ent = LD.electionNode(site, el, url);
    const crumbs = [{ label: "Accueil", url: "/" }, { label: "Élections", url: "/elections/" }, { label: el.name, url }];
    return JSON.stringify(LD.entityGraph(site, { url, title: el.name, description: el.summary, crumbs, entity: ent })).replace(/</g, "\\u003c");
  });
  eleventyConfig.addFilter("ldPage", (opts) => JSON.stringify(LD.genericGraph(site, { ...opts, ldKind: undefined, nodes: extraNodes(opts.ldKind, opts.url) })).replace(/</g, "\\u003c"));


  // ——— Partis : registre (couleur, sigle, position gauche-droite)
  const partyInfo = (slug) => {
    const e = slug ? corpus.get(slug) : null;
    if (!e || e.type !== "parti") return null;
    return { slug, title: e.title, short: e.short || e.title, color: e.data.color ? `var(--p-${slug})` : "var(--p-autre)", hex: e.data.color || "#9a9890", hexDark: e.data.color_dark || e.data.color || "#77756f", lr: typeof e.data.lr === "number" ? e.data.lr : 5, url: e.url, family: e.data.family || "autre", community: e.data.community || "" };
  };
  eleventyConfig.addFilter("partyInfo", partyInfo);
  const withInfo = (seats = []) =>
    (seats || [])
      .map((s) => {
        const info = partyInfo(s.party);
        return { ...s, slug: s.party || null, color: info ? info.color : "var(--p-autre)", lr: info ? info.lr : 5, url: info ? info.url : null, label: s.label || (info ? info.short : "?") };
      })
      .sort((a, b) => a.lr - b.lr);
  eleventyConfig.addFilter("seatsWithInfo", withInfo);
  eleventyConfig.addFilter("hemicycle", (seats, total, title, idPrefix = "h") => hemicycleSvg(withInfo(seats), total, { title, idPrefix }));
  eleventyConfig.addFilter("familyMap", (parties = []) => Object.fromEntries(parties.map((p) => [p.slug, p.data.family || "autre"])));
  eleventyConfig.addFilter("bySeats", (seats = []) => [...(seats || [])].sort((a, b) => b.seats - a.seats));

  // ——— Shortcodes
  eleventyConfig.addShortcode("icon", (name, cls = "") => `<svg class="icon ${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`);

  // ——— Données dérivées (aperçus, graphe) accessibles aux gabarits JSON
  eleventyConfig.addGlobalData("derived", () => ({
    previews: previewIndex(corpus),
    graph: graphData(corpus),
  }));
  // Accès au corpus complet (get, ofType…) pour les gabarits JavaScript (jeux de données, flux, thésaurus).
  eleventyConfig.addGlobalData("rawCorpus", () => corpusProxyFull);

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    pathPrefix: site.pathPrefix,
    templateFormats: ["md", "njk", "11ty.js", "html"],
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
  };
}
