// Chargement du corpus encyclopédique : toutes les entrées (notices, partis, personnalités,
// dossiers, gouvernements, élections) indexées par slug, avec le graphe des wiki-liens.
// Ce module est indépendant d'Eleventy : il lit directement les fichiers sources.

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { KINDS, THEME_BY_SLUG, runningLabel } from "./taxonomy.js";
import { plainText, truncate, wordCount, compareFr, unique, sortKey } from "./utils.js";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CONTENT = path.join(ROOT, "src", "content");
const DATA = path.join(ROOT, "src", "_data");

export const WIKILINK_RE = /\[\[([a-z0-9][a-z0-9-]*)(?:#([a-z0-9-]+))?(?:\|([^\]]+))?\]\]/g;

const COLLECTIONS = [
  { dir: "notions", type: "notion", base: "/notions/" },
  { dir: "partis", type: "parti", base: "/partis/" },
  { dir: "personnalites", type: "personne", base: "/personnalites/" },
  { dir: "dossiers", type: "dossier", base: "/dossiers/" },
];

function readJson(file, fallback) {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function defaultKind(type) {
  return { parti: "parti", personne: "personne", dossier: "dossier" }[type] || "concept";
}

/** Convertit récursivement les objets Date (YAML) en chaînes ISO « AAAA-MM-JJ ». */
export function datesToIso(v) {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (Array.isArray(v)) return v.map(datesToIso);
  if (v && typeof v === "object") {
    const out = {};
    for (const [k, x] of Object.entries(v)) out[k] = datesToIso(x);
    return out;
  }
  return v;
}

function normalizeEntry(rawFm, body, { slug, type, base, file }) {
  const fm = datesToIso(rawFm);
  const kind = fm.kind || defaultKind(type);
  const summary = fm.summary ? String(fm.summary).trim() : truncate(plainText(body), 220);
  const entry = {
    slug,
    type,
    kind,
    file,
    title: fm.title || slug,
    short: fm.short || null,
    url: `${base}${slug}/`,
    summary,
    themes: Array.isArray(fm.themes) ? fm.themes : fm.themes ? [fm.themes] : [],
    aliases: Array.isArray(fm.aliases) ? fm.aliases : [],
    terms: fm.terms || {},
    related: Array.isArray(fm.related) ? fm.related : [],
    level: fm.level || 1,
    data: fm,
    body,
    words: wordCount(body),
  };
  entry.label = runningLabel({ ...fm, kind, title: entry.title });
  if (fm.founded) entry.data.founded_sort = Number(String(fm.founded).slice(0, 4));
  return entry;
}

function extractLinks(text = "") {
  const out = [];
  for (const m of String(text).matchAll(WIKILINK_RE)) out.push(m[1]);
  return out;
}

let cache = null;

export function loadCorpus({ force = false } = {}) {
  if (cache && !force) return cache;

  const entries = [];
  const problems = [];

  // 1. Contenus Markdown
  for (const col of COLLECTIONS) {
    const dir = path.join(CONTENT, col.dir);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).sort()) {
      if (!f.endsWith(".md")) continue;
      const file = path.join(dir, f);
      const raw = fs.readFileSync(file, "utf8");
      let parsed;
      try {
        parsed = matter(raw);
      } catch (e) {
        problems.push({ file, message: `Front matter invalide : ${e.message}` });
        continue;
      }
      const slug = f.replace(/\.md$/, "");
      entries.push(normalizeEntry(parsed.data, parsed.content, { slug, type: col.type, base: col.base, file }));
    }
  }

  // 2. Gouvernements (données structurées)
  const govs = readJson("gouvernements.json", { items: [] }).items || [];
  for (const g of govs) {
    const slug = `gouvernement-${g.id}`;
    entries.push({
      slug,
      type: "gouvernement",
      kind: "gouvernement",
      file: "src/_data/gouvernements.json",
      title: g.name,
      short: g.nickname || null,
      url: `/gouvernements/${g.id}/`,
      summary: g.summary || `${g.name} (${g.level_label || ""}).`,
      themes: ["gouvernement", ...(g.themes || [])],
      aliases: g.nickname ? [g.nickname] : [],
      terms: {},
      related: [],
      level: 2,
      data: g,
      body: g.text || "",
      words: wordCount(g.text || ""),
      label: g.name,
    });
  }

  // 3. Élections (données structurées)
  const elections = readJson("elections.json", { items: [] }).items || [];
  for (const el of elections) {
    const slug = `elections-${el.id}`;
    entries.push({
      slug,
      type: "election",
      kind: "election",
      file: "src/_data/elections.json",
      title: el.name,
      short: null,
      url: `/elections/${el.id}/`,
      summary: el.summary || el.name,
      themes: ["elections", ...(el.themes || [])],
      aliases: [],
      terms: {},
      related: [],
      level: 2,
      data: el,
      body: el.text || "",
      words: wordCount(el.text || ""),
      label: el.name,
    });
  }

  // 4. Index
  const bySlug = new Map();
  for (const e of entries) {
    if (bySlug.has(e.slug)) {
      problems.push({ file: e.file, message: `Slug en double : ${e.slug} (déjà dans ${bySlug.get(e.slug).file})` });
      continue;
    }
    bySlug.set(e.slug, e);
  }

  // 5. Graphe des liens
  const backlinks = new Map();
  const broken = [];
  for (const e of bySlug.values()) {
    const fromBody = extractLinks(e.body);
    const fromData = [
      ...(e.related || []),
      ...((e.data && e.data.not_to_confuse) || []).map((x) => (typeof x === "string" ? x : x.slug)),
    ].filter(Boolean);
    e.links = unique(fromBody);
    e.relatedValid = [];
    for (const s of unique([...fromBody, ...fromData])) {
      if (!bySlug.has(s)) {
        broken.push({ from: e.slug, file: e.file, to: s });
        continue;
      }
      if (s === e.slug) continue;
      if (!backlinks.has(s)) backlinks.set(s, new Set());
      if (fromBody.includes(s)) backlinks.get(s).add(e.slug);
    }
    e.relatedValid = (e.related || []).filter((s) => bySlug.has(s) && s !== e.slug);
  }
  for (const e of bySlug.values()) {
    e.backlinks = [...(backlinks.get(e.slug) || [])].sort((a, b) => compareFr(bySlug.get(a).title, bySlug.get(b).title));
  }

  // 6. Thèmes : contrôle
  for (const e of bySlug.values()) {
    for (const t of e.themes) {
      if (!THEME_BY_SLUG[t]) problems.push({ file: e.file, message: `Thème inconnu « ${t} » dans ${e.slug}` });
    }
    if (e.kind && !KINDS[e.kind]) problems.push({ file: e.file, message: `Nature inconnue « ${e.kind} » dans ${e.slug}` });
  }

  const all = [...bySlug.values()].sort((a, b) => compareFr(a.title, b.title));

  cache = {
    all,
    bySlug,
    broken,
    problems,
    get(slug) {
      return bySlug.get(slug);
    },
    ofType(type) {
      return all.filter((e) => e.type === type);
    },
    ofTheme(theme) {
      return all.filter((e) => e.themes.includes(theme));
    },
  };
  return cache;
}

/** Données légères pour les aperçus au survol et la recherche locale. */
export function previewIndex(corpus) {
  const out = {};
  for (const e of corpus.all) {
    out[e.slug] = {
      t: e.title,
      s: truncate(e.summary, 260),
      k: (KINDS[e.kind] || {}).label || "",
      u: e.url,
    };
  }
  return out;
}

/** Graphe pour la visualisation : nœuds + arêtes non orientées dédoublonnées. */
export function graphData(corpus) {
  const nodes = [];
  const seen = new Set();
  const edges = [];
  const include = (e) => ["notion", "parti", "dossier", "personne"].includes(e.type);
  for (const e of corpus.all) {
    if (!include(e)) continue;
    nodes.push({ id: e.slug, t: e.short || e.title, k: e.kind, ty: e.type, th: e.themes[0] || "", u: e.url });
  }
  const ids = new Set(nodes.map((n) => n.id));
  for (const e of corpus.all) {
    if (!ids.has(e.slug)) continue;
    for (const to of unique([...(e.links || []), ...(e.relatedValid || [])])) {
      if (!ids.has(to) || to === e.slug) continue;
      const key = [e.slug, to].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([e.slug, to]);
    }
  }
  const degree = {};
  for (const [a, b] of edges) {
    degree[a] = (degree[a] || 0) + 1;
    degree[b] = (degree[b] || 0) + 1;
  }
  for (const n of nodes) n.d = degree[n.id] || 0;
  return { nodes, edges };
}

/** Entrées triées par lettre initiale. */
export function abecedaire(entries) {
  const groups = {};
  for (const e of entries) {
    const c = sortKey(e.title).charAt(0).toUpperCase();
    const L = /[A-Z]/.test(c) ? c : "#";
    (groups[L] ||= []).push(e);
  }
  return Object.keys(groups)
    .sort()
    .map((letter) => ({ letter, entries: groups[letter].sort((a, b) => compareFr(a.title, b.title)) }));
}
