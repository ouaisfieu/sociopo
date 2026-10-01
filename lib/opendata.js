// Jeux de données ouverts (JSON) dérivés du corpus et des fichiers _data.
// Utilisés par les outils interactifs et publiés sous /data/*.json (licence CC BY 4.0).
import { THEMES, KINDS, FAMILIES } from "./taxonomy.js";
import { yearOf } from "./utils.js";

const LICENSE = "https://creativecommons.org/licenses/by/4.0/deed.fr";

function meta(site, name, description) {
  return {
    "@context": "https://schema.org",
    name,
    description,
    license: LICENSE,
    publisher: site.editor,
    url: `${site.url}${site.pathPrefix}data/`,
    dateModified: site.updated,
  };
}

/** Partis : fiche résumée, filiation (prédécesseurs / successeurs) et couleurs. */
export function partis(corpus) {
  const list = corpus.ofType("parti");
  const succ = {};
  for (const p of list) for (const pre of p.data.predecessors || []) (succ[pre] ||= []).push(p.slug);
  return list.map((p) => ({
    slug: p.slug,
    title: p.title,
    short: p.short || p.title,
    family: p.data.family || "autre",
    familyLabel: (FAMILIES[p.data.family] || {}).label || "",
    community: p.data.community || null,
    founded: p.data.founded ? String(p.data.founded) : null,
    dissolved: p.data.dissolved ? String(p.data.dissolved) : null,
    from: yearOf(p.data.founded),
    to: yearOf(p.data.dissolved),
    predecessors: (p.data.predecessors || []).filter((s) => corpus.get(s)),
    successors: succ[p.slug] || [],
    lr: p.data.lr ?? null,
    color: p.data.color || null,
    colorDark: p.data.color_dark || null,
    seats: p.data.seats || null,
    president: p.data.president ? { name: p.data.president.name, since: p.data.president.since ? String(p.data.president.since) : null } : null,
    position: p.data.position || null,
    summary: p.summary,
    url: p.url,
  }));
}

/** Notions : version compacte pour les quiz, cartes mémoire et la recherche hors ligne. */
export function notions(corpus) {
  return corpus.ofType("notion").map((n) => ({
    s: n.slug,
    t: n.title,
    k: n.kind,
    kl: (KINDS[n.kind] || {}).label || "",
    th: n.themes,
    l: n.level || 1,
    d: n.summary,
    nl: n.terms?.nl || null,
    de: n.terms?.de || null,
    en: n.terms?.en || null,
    a: n.aliases || [],
    u: n.url,
  }));
}

export function personnalites(corpus) {
  return corpus.ofType("personne").map((p) => ({
    s: p.slug,
    t: p.title,
    party: p.data.party || null,
    partyLabel: p.data.party_label || null,
    born: p.data.born ? String(p.data.born) : null,
    died: p.data.died ? String(p.data.died) : null,
    group: p.data.group || null,
    roles: (p.data.roles || []).map((r) => ({ role: r.role, from: r.from ? String(r.from) : null, to: r.to ? String(r.to) : null })),
    d: p.summary,
    u: p.url,
  }));
}

const LEVEL_BY_PARLIAMENT = { flandre: "flandre", wallonie: "wallonie", bruxelles: "bruxelles", fwb: "fwb", dg: "dg" };

/** Assemblées pour le simulateur de coalitions (Chambre 2007-2024, parlements fédérés 2014-2024). */
export function parlements(elections, gouvernements, corpus) {
  const govs = gouvernements.items;
  const community = (slug) => corpus.get(slug)?.data?.community || null;
  const firstGovAfter = (level, date) =>
    govs.filter((g) => g.level === level && g.start > date).sort((a, b) => a.start.localeCompare(b.start))[0] || null;
  const seatList = (seats) => seats.filter((s) => s.seats > 0).map((s) => ({ party: s.party, label: s.label, seats: s.seats, pct: s.pct ?? null }));
  const out = [];

  for (const el of elections.items.filter((e) => e.type === "chambre" && Number(e.date.slice(0, 4)) >= 2007)) {
    const year = el.date.slice(0, 4);
    const seats = seatList(el.seats);
    const a = {
      id: `chambre-${year}`,
      name: `Chambre des représentants (${year})`,
      short: `Chambre ${year}`,
      level: "federal",
      year: Number(year),
      total: el.total,
      majority: Math.floor(el.total / 2) + 1,
      seats,
      election: el.id,
      government: el.government || null,
    };
    if (year === "2024") {
      // Ventilation vérifiée : 89 néerlandophones, 61 francophones ; PTB-PVDA 8 NL / 7 FR.
      a.groups = { nl: { label: "Groupe néerlandais", total: 89 }, fr: { label: "Groupe français", total: 61 } };
      a.split = Object.fromEntries(
        seats.map((s) => [s.party, s.party === "ptb-pvda" ? { nl: 8, fr: 7 } : community(s.party) === "nl" ? { nl: s.seats, fr: 0 } : { nl: 0, fr: s.seats }]),
      );
      a.special = true;
    }
    out.push(a);
  }

  for (const el of elections.items.filter((e) => e.type === "regionales")) {
    const year = el.date.slice(0, 4);
    const P = Object.fromEntries(el.parliaments.map((p) => [p.id, p]));
    for (const id of ["flandre", "wallonie", "fwb", "dg"]) {
      const p = P[id];
      if (!p) continue;
      const gov = firstGovAfter(LEVEL_BY_PARLIAMENT[id], el.date);
      out.push({
        id: `${id}-${year}`,
        name: `${p.name} (${year})`,
        short: `${{ flandre: "Flandre", wallonie: "Wallonie", fwb: "FWB", dg: "Comm. germanophone" }[id]} ${year}`,
        level: id,
        year: Number(year),
        total: p.total,
        majority: Math.floor(p.total / 2) + 1,
        seats: seatList(p.seats),
        election: el.id,
        government: gov ? gov.id : null,
      });
    }
    if (P["bruxelles-fr"] && P["bruxelles-nl"]) {
      const fr = seatList(P["bruxelles-fr"].seats).map((s) => ({ ...s, key: `${s.party}@fr` }));
      const nl = seatList(P["bruxelles-nl"].seats).map((s) => ({ ...s, key: `${s.party}@nl` }));
      const gov = firstGovAfter("bruxelles", el.date);
      out.push({
        id: `bruxelles-${year}`,
        name: `Parlement de la Région de Bruxelles-Capitale (${year})`,
        short: `Bruxelles ${year}`,
        level: "bruxelles",
        year: Number(year),
        total: 89,
        majority: 45,
        seats: [...fr.map((s) => ({ ...s, group: "fr" })), ...nl.map((s) => ({ ...s, group: "nl" }))],
        groups: { fr: { label: "Groupe français", total: 72 }, nl: { label: "Groupe néerlandais", total: 17 } },
        byGroup: true,
        election: el.id,
        government: gov ? gov.id : null,
      });
    }
  }
  const order = { federal: 0, flandre: 1, wallonie: 2, bruxelles: 3, fwb: 4, dg: 5 };
  out.sort((a, b) => b.year - a.year || order[a.level] - order[b.level]);
  // Coalitions effectivement formées (pour comparer)
  const govIndex = Object.fromEntries(govs.map((g) => [g.id, g]));
  for (const a of out) {
    const g = a.government && govIndex[a.government];
    if (g) a.formed = { id: g.id, name: g.name, nickname: g.nickname || null, parties: g.parties, start: g.start, days: g.formation_days ?? null };
  }
  return out;
}

export function themes() {
  return THEMES.map((t) => ({ slug: t.slug, label: t.label, short: t.short, icon: t.icon }));
}

export const DATASETS = [
  { name: "notions", title: "Notions du lexique", description: "Toutes les notions : titre, nature, thèmes, niveau, définition courte, équivalents néerlandais, allemand et anglais, synonymes." },
  { name: "partis", title: "Partis politiques", description: "Partis belges actuels et historiques : famille, communauté, dates, filiation, position, couleurs, sièges 2024." },
  { name: "personnalites", title: "Personnalités", description: "Figures clés de la vie politique belge : parti, dates, fonctions exercées." },
  { name: "gouvernements", title: "Gouvernements", description: "Gouvernements fédéraux depuis 1945 et gouvernements des entités fédérées depuis 1999 : chef, partis, dates, durée de formation." },
  { name: "elections", title: "Résultats électoraux", description: "Sièges à la Chambre depuis 1919, élections régionales 2014-2024, européennes 2019-2024, communales 2024." },
  { name: "parlements", title: "Assemblées et rapports de forces", description: "Composition des assemblées (Chambre 2007-2024, parlements fédérés 2014-2024) prête pour la simulation de coalitions." },
  { name: "chronologie", title: "Chronologie", description: "Événements politiques datés de 1789 à 2026 (réformes, élections, crises, lois, monarchie)." },
  { name: "competences", title: "Répartition des compétences", description: "Qui est compétent pour quoi ? Matières et niveau de pouvoir responsable après la sixième réforme de l'État." },
  { name: "quiz", title: "Banque de questions", description: "Questions de quiz rédigées, avec réponse et explication." },
  { name: "themes", title: "Thèmes", description: "Les 23 thèmes de l'encyclopédie." },
];

export function buildDataset(name, { corpus, site, elections, gouvernements, chronologie, quiz, competences }) {
  const ds = DATASETS.find((d) => d.name === name);
  const head = meta(site, `Sociopo — ${ds.title}`, ds.description);
  const data = {
    notions: () => notions(corpus),
    partis: () => partis(corpus),
    personnalites: () => personnalites(corpus),
    gouvernements: () => gouvernements,
    elections: () => elections,
    parlements: () => parlements(elections, gouvernements, corpus),
    chronologie: () => chronologie,
    competences: () => competences,
    quiz: () => quiz,
    themes: () => themes(),
  }[name]();
  return { meta: head, data };
}
