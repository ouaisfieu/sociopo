// Données structurées schema.org (JSON-LD) pour chaque type de page.
// Toutes les URL sont absolues ; les identifiants @id sont stables (URL + fragment).

import { KINDS, THEME_BY_SLUG } from "./taxonomy.js";
import { unique } from "./utils.js";

export function absUrl(site, p = "/") {
  if (/^https?:\/\//.test(p)) return p;
  const base = site.url.replace(/\/$/, "") + site.pathPrefix.replace(/\/$/, "");
  return base + (p.startsWith("/") ? p : `/${p}`);
}

export function ids(site) {
  return {
    website: absUrl(site, "/#site"),
    org: absUrl(site, "/#editeur"),
    termset: absUrl(site, "/lexique/#lexique"),
    belgium: absUrl(site, "/#belgique"),
  };
}

export function baseGraph(site) {
  const I = ids(site);
  return [
    {
      "@type": "WebSite",
      "@id": I.website,
      url: absUrl(site, "/"),
      name: site.name,
      alternateName: site.title,
      description: site.description,
      inLanguage: site.lang,
      publisher: { "@id": I.org },
      license: site.license.url,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: absUrl(site, "/recherche/?q={search_term_string}") },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": I.org,
      name: site.editor,
      alternateName: site.name,
      url: absUrl(site, "/a-propos/"),
      logo: { "@type": "ImageObject", url: absUrl(site, "/assets/img/logo-512.png"), width: 512, height: 512 },
      sameAs: [site.repo],
      description: "Rédaction collective et anonyme de Sociopo, encyclopédie libre et sans traceur de la sociopolitique belge.",
    },
  ];
}

function breadcrumb(site, url, crumbs) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${absUrl(site, url)}#fil`,
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: absUrl(site, c.url),
    })),
  };
}

function webPage(site, { url, title, description, crumbs, mainId, type = "WebPage", dateModified, extra = {} }) {
  const I = ids(site);
  const page = {
    "@type": type,
    "@id": `${absUrl(site, url)}#page`,
    url: absUrl(site, url),
    name: title,
    description,
    inLanguage: site.lang,
    isPartOf: { "@id": I.website },
    publisher: { "@id": I.org },
    license: site.license.url,
    isAccessibleForFree: true,
    ...extra,
  };
  if (dateModified) page.dateModified = dateModified;
  if (crumbs && crumbs.length) page.breadcrumb = { "@id": `${absUrl(site, url)}#fil` };
  if (mainId) {
    page.mainEntity = { "@id": mainId };
    page.about = { "@id": mainId };
  }
  return page;
}

function sameAsOf(data = {}) {
  const out = [];
  const wp = data.wikipedia || {};
  if (wp.fr) out.push(`https://fr.wikipedia.org/wiki/${encodeURIComponent(wp.fr.replace(/ /g, "_"))}`);
  if (wp.nl) out.push(`https://nl.wikipedia.org/wiki/${encodeURIComponent(wp.nl.replace(/ /g, "_"))}`);
  if (wp.en) out.push(`https://en.wikipedia.org/wiki/${encodeURIComponent(wp.en.replace(/ /g, "_"))}`);
  if (data.wikidata) out.push(`https://www.wikidata.org/wiki/${data.wikidata}`);
  if (data.website) out.push(data.website);
  for (const u of data.sameAs || []) out.push(u);
  return unique(out);
}

function altNames(entry) {
  const t = entry.terms || {};
  return unique([entry.short, ...(entry.aliases || []), t.nl, t.de, t.en].filter(Boolean)).filter((n) => n !== entry.title);
}

/** Nœud de l'entité décrite par une notice (concept, institution, loi, événement…). */
export function entityNode(site, entry, corpus) {
  const I = ids(site);
  const url = absUrl(site, entry.url);
  const d = entry.data || {};
  const kind = KINDS[entry.kind] || KINDS.concept;
  const types = [...kind.schema];
  // Toute notice du lexique est aussi un terme défini du thésaurus Sociopo.
  if (!types.includes("DefinedTerm") && ["notion"].includes(entry.type)) types.push("DefinedTerm");
  const node = {
    "@type": types.length === 1 ? types[0] : types,
    "@id": `${url}#entite`,
    name: entry.title,
    description: entry.summary,
    url,
  };
  const alt = altNames(entry);
  if (alt.length) node.alternateName = alt;
  const sa = sameAsOf(d);
  if (sa.length) node.sameAs = sa;
  if (types.includes("DefinedTerm")) {
    node.inDefinedTermSet = { "@id": I.termset };
    node.termCode = entry.slug;
  }
  const subjects = entry.themes.map((t) => THEME_BY_SLUG[t]).filter(Boolean).map((t) => t.label);
  if (subjects.length) node.keywords = subjects.join(", ");

  switch (entry.kind) {
    case "institution":
    case "organisation":
      if (d.founded) node.foundingDate = String(d.founded);
      if (d.dissolved) node.dissolutionDate = String(d.dissolved);
      node.areaServed = { "@id": I.belgium };
      if (d.website) node.url = d.website;
      node.mainEntityOfPage = url;
      break;
    case "loi":
      if (d.date) node.legislationDate = String(d.date);
      node.legislationJurisdiction = d.jurisdiction || "BE";
      if (d.legislation_type) node.legislationType = d.legislation_type;
      if (d.in_force === false) node.legislationLegalForce = "https://schema.org/NotInForce";
      else if (d.in_force === "partial") node.legislationLegalForce = "https://schema.org/PartiallyInForce";
      else node.legislationLegalForce = "https://schema.org/InForce";
      if (d.eli) node.legislationIdentifier = d.eli;
      break;
    case "accord":
      if (d.date) node.dateCreated = String(d.date);
      node.genre = "Accord politique";
      break;
    case "evenement":
      if (d.date) node.startDate = String(d.date);
      if (d.date_end) node.endDate = String(d.date_end);
      node.location = d.place
        ? { "@type": "Place", name: d.place, containedInPlace: { "@id": I.belgium } }
        : { "@id": I.belgium };
      node.eventAttendanceMode = "https://schema.org/OfflineEventAttendanceMode";
      node.eventStatus = "https://schema.org/EventScheduled";
      break;
    case "territoire":
      node.containedInPlace = { "@id": I.belgium };
      break;
    default:
      break;
  }
  return node;
}

export function belgiumNode(site) {
  return {
    "@type": "Country",
    "@id": ids(site).belgium,
    name: "Belgique",
    alternateName: ["België", "Belgien", "Belgium"],
    sameAs: ["https://www.wikidata.org/wiki/Q31"],
  };
}

export function noticeGraph(site, entry, corpus, crumbs, extraNodes = []) {
  const url = absUrl(site, entry.url);
  const ent = entityNode(site, entry, corpus);
  const graph = [
    ...baseGraph(site),
    webPage(site, {
      url: entry.url,
      title: entry.title,
      description: entry.summary,
      crumbs,
      mainId: ent["@id"],
      dateModified: entry.data.updated ? String(entry.data.updated) : site.updated,
      extra: entry.data.level ? { educationalLevel: ["", "Découverte", "Approfondissement", "Expert"][entry.level] || undefined } : {},
    }),
    breadcrumb(site, entry.url, crumbs),
    ent,
    belgiumNode(site),
    ...extraNodes,
  ];
  if (Array.isArray(entry.data.faq) && entry.data.faq.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: entry.data.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  return { "@context": "https://schema.org", "@graph": graph };
}

export function partyNode(site, entry, corpus) {
  const I = ids(site);
  const d = entry.data || {};
  const url = absUrl(site, entry.url);
  const node = {
    "@type": "PoliticalParty",
    "@id": `${url}#entite`,
    name: entry.title,
    description: entry.summary,
    url: d.website || url,
    mainEntityOfPage: url,
    areaServed: { "@id": I.belgium },
  };
  const alt = altNames(entry);
  if (alt.length) node.alternateName = alt;
  if (d.founded) node.foundingDate = String(d.founded);
  if (d.dissolved) node.dissolutionDate = String(d.dissolved);
  const sa = sameAsOf(d);
  if (sa.length) node.sameAs = sa;
  if (d.europarty) node.memberOf = { "@type": "Organization", name: d.europarty };
  if (d.president && d.president.name) {
    node.member = {
      "@type": "OrganizationRole",
      roleName: "Président·e",
      startDate: d.president.since ? String(d.president.since) : undefined,
      member: { "@type": "Person", name: d.president.name, ...(d.president.slug && corpus.get(d.president.slug) ? { "@id": `${absUrl(site, corpus.get(d.president.slug).url)}#entite` } : {}) },
    };
  }
  if (Array.isArray(d.predecessors)) {
    const pre = d.predecessors.map((s) => corpus.get(s)).filter(Boolean);
    if (pre.length) node.parentOrganization = pre.map((p) => ({ "@id": `${absUrl(site, p.url)}#entite` }));
  }
  return node;
}

export function personNode(site, entry, corpus) {
  const I = ids(site);
  const d = entry.data || {};
  const url = absUrl(site, entry.url);
  const node = {
    "@type": "Person",
    "@id": `${url}#entite`,
    name: entry.title,
    description: entry.summary,
    url,
    nationality: { "@id": I.belgium },
  };
  if (d.born) node.birthDate = String(d.born);
  if (d.died) node.deathDate = String(d.died);
  if (d.birthplace) node.birthPlace = { "@type": "Place", name: d.birthplace };
  if (d.job) node.jobTitle = d.job;
  const party = d.party ? corpus.get(d.party) : null;
  if (party) node.affiliation = { "@id": `${absUrl(site, party.url)}#entite`, "@type": "PoliticalParty", name: party.title };
  const sa = sameAsOf(d);
  if (sa.length) node.sameAs = sa;
  if (Array.isArray(d.roles) && d.roles.length) {
    node.hasOccupation = d.roles.slice(0, 12).map((r) => ({
      "@type": "Role",
      roleName: r.role,
      startDate: r.from ? String(r.from) : undefined,
      endDate: r.to ? String(r.to) : undefined,
    }));
  }
  return node;
}

export function articleNode(site, entry, corpus) {
  const I = ids(site);
  const d = entry.data || {};
  const url = absUrl(site, entry.url);
  const about = (d.about || entry.relatedValid || [])
    .map((s) => corpus.get(s))
    .filter(Boolean)
    .slice(0, 12)
    .map((e) => ({ "@id": `${absUrl(site, e.url)}#entite`, name: e.title }));
  return {
    "@type": "Article",
    "@id": `${url}#entite`,
    headline: entry.title,
    description: entry.summary,
    url,
    mainEntityOfPage: url,
    inLanguage: site.lang,
    datePublished: String(d.published || site.updated),
    dateModified: String(d.updated || d.published || site.updated),
    author: { "@id": I.org },
    publisher: { "@id": I.org },
    isAccessibleForFree: true,
    license: site.license.url,
    wordCount: entry.words,
    articleSection: "Dossiers",
    image: absUrl(site, "/assets/img/og/dossiers.png"),
    about,
    citation: (d.sources || []).map((s) => ({ "@type": "CreativeWork", name: s.title, url: s.url || undefined, publisher: s.publisher || undefined })),
  };
}

export function governmentNode(site, g, corpus, url) {
  const I = ids(site);
  const node = {
    "@type": "GovernmentOrganization",
    "@id": `${absUrl(site, url)}#entite`,
    name: g.name,
    url: absUrl(site, url),
    description: g.summary,
    foundingDate: g.start,
    areaServed: { "@id": I.belgium },
  };
  if (g.nickname) node.alternateName = g.nickname;
  if (g.end) node.dissolutionDate = g.end;
  const members = [];
  for (const p of g.parties || []) {
    const pe = corpus.get(p);
    if (pe) members.push({ "@type": "PoliticalParty", "@id": `${absUrl(site, pe.url)}#entite`, name: pe.title });
  }
  if (g.head && corpus.get(g.head)) {
    const he = corpus.get(g.head);
    node.employee = { "@type": "Person", "@id": `${absUrl(site, he.url)}#entite`, name: he.title, jobTitle: g.head_title || "Chef du gouvernement" };
  } else if (g.head_name) {
    node.employee = { "@type": "Person", name: g.head_name, jobTitle: g.head_title || "Chef du gouvernement" };
  }
  if (members.length) node.member = members;
  return node;
}

export function electionNode(site, el, url) {
  const I = ids(site);
  return {
    "@type": "Event",
    "@id": `${absUrl(site, url)}#entite`,
    name: el.name,
    description: el.summary,
    startDate: el.date,
    endDate: el.date,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@id": I.belgium },
    organizer: { "@type": "GovernmentOrganization", name: "SPF Intérieur — Direction des élections" },
    url: absUrl(site, url),
  };
}

export function genericGraph(site, { url, title, description, crumbs, type = "WebPage", nodes = [], extra = {} }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...baseGraph(site),
      webPage(site, { url, title, description, crumbs, type, extra, dateModified: site.updated }),
      ...(crumbs && crumbs.length ? [breadcrumb(site, url, crumbs)] : []),
      ...nodes,
    ],
  };
}

export function entityGraph(site, { url, title, description, crumbs, entity, extraNodes = [], dateModified }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...baseGraph(site),
      webPage(site, { url, title, description, crumbs, mainId: entity["@id"], dateModified: dateModified || site.updated }),
      ...(crumbs && crumbs.length ? [breadcrumb(site, url, crumbs)] : []),
      entity,
      belgiumNode(site),
      ...extraNodes,
    ],
  };
}
