// Données calculées communes aux pages d'entrées (notices, partis, personnalités, dossiers).
import site from "../src/_data/site.js";
import { loadCorpus } from "./corpus.js";
import * as LD from "./jsonld.js";
import { THEME_BY_SLUG } from "./taxonomy.js";

const SECTIONS = {
  notion: { label: "Lexique", url: "/lexique/" },
  parti: { label: "Partis", url: "/partis/" },
  personne: { label: "Personnalités", url: "/personnalites/" },
  dossier: { label: "Dossiers", url: "/dossiers/" },
  gouvernement: { label: "Gouvernements", url: "/gouvernements/" },
  election: { label: "Élections", url: "/elections/" },
};

export function crumbsFor(entry) {
  const crumbs = [{ label: "Accueil", url: "/" }];
  const sec = SECTIONS[entry.type];
  if (sec) crumbs.push(sec);
  if (entry.type === "notion" && entry.themes[0] && THEME_BY_SLUG[entry.themes[0]]) {
    crumbs.push({ label: THEME_BY_SLUG[entry.themes[0]].label, url: `/themes/${entry.themes[0]}/` });
  }
  crumbs.push({ label: entry.title, url: entry.url });
  return crumbs;
}

export function jsonLdFor(entry) {
  const corpus = loadCorpus();
  const crumbs = crumbsFor(entry);
  let g;
  const base = { url: entry.url, title: entry.title, description: entry.summary, crumbs, dateModified: entry.data.updated ? String(entry.data.updated) : site.updated };
  if (entry.type === "parti") g = LD.entityGraph(site, { ...base, entity: LD.partyNode(site, entry, corpus) });
  else if (entry.type === "personne") g = LD.entityGraph(site, { ...base, entity: LD.personNode(site, entry, corpus) });
  else if (entry.type === "dossier") g = LD.entityGraph(site, { ...base, entity: LD.articleNode(site, entry, corpus) });
  else g = LD.noticeGraph(site, entry, corpus, crumbs);
  return JSON.stringify(g).replace(/</g, "\\u003c");
}

const OG = {
  notion: (e) => `/assets/img/og/${e.themes[0] || "default"}.png`,
  parti: () => "/assets/img/og/partis.png",
  personne: () => "/assets/img/og/personnalites.png",
  dossier: () => "/assets/img/og/dossiers.png",
};

export function computedFor(type, base) {
  const get = (data) => loadCorpus().get(data.page.fileSlug);
  return {
    permalink: (data) => `${base}${data.page.fileSlug}/`,
    slug: (data) => data.page.fileSlug,
    entry: (data) => get(data),
    title: (data) => (get(data) || {}).title || data.title,
    description: (data) => (get(data) || {}).summary || data.description,
    jsonld: (data) => {
      const e = get(data);
      return e ? jsonLdFor(e) : undefined;
    },
    ogImage: (data) => {
      const e = get(data);
      return e && OG[type] ? OG[type](e) : undefined;
    },
    ogType: () => (type === "dossier" ? "article" : "article"),
    bodyClass: () => `page-${type}`,
  };
}
