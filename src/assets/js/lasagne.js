// La lasagne institutionnelle : les niveaux de pouvoir qui s'empilent au-dessus des habitants d'une commune.
import { el, url, params } from "./_ui.js";
import { update } from "./_store.js";

const root = document.querySelector("[data-lasagne]");

const C = { eu: "#5b4bb7", fed: "#1f3a63", com: "#b5452f", reg: "#2f7a4f", bxl: "#8a6d1f", prov: "#a36a00", loc: "#6b6a64" };

const EU = (college, seats) => ({ c: C.eu, k: "UE", t: "Union européenne", d: seats ? `Vous élisez des députés européens dans le collège ${college} (${seats} siège${seats > 1 ? "s" : ""} sur les 22 de la Belgique).` : college, vote: 1, link: "elections-europeennes" });
const FED = (circ, seats, extra = "") => ({ c: C.fed, k: "Féd.", t: "État fédéral", d: seats ? `Vous élisez la Chambre dans la circonscription ${circ} (${seats} sièges).${extra}` : circ, vote: 1, link: "etat-federal" });

const COMMUNES = {
  gand: {
    name: "Gand",
    blurb: "Chef-lieu de la Flandre-Orientale, en région de langue néerlandaise.",
    layers: [
      EU("néerlandophone", 13),
      FED("de Flandre-Orientale", 20),
      { c: C.com, k: "Fl.", t: "Communauté et Région flamandes", d: "Un seul Parlement flamand (124 membres) et un seul gouvernement exercent les compétences communautaires et régionales depuis 1980.", vote: 1, link: "communaute-flamande" },
      { c: C.prov, k: "Prov.", t: "Province de Flandre-Orientale", d: "Un conseil provincial élu, aux compétences réduites depuis 2018 en Flandre (fin des compétences « personnalisables »).", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Ville de Gand", d: "Conseil communal élu en octobre 2024, première élection locale flamande sans vote obligatoire. S'y ajoutent le CPAS, la zone de police, la zone de secours et les intercommunales.", vote: 1, link: "commune" },
    ],
  },
  anvers: {
    name: "Anvers",
    blurb: "Seule ville belge divisée en districts dotés de conseils élus.",
    layers: [
      EU("néerlandophone", 13),
      FED("d'Anvers", 24),
      { c: C.com, k: "Fl.", t: "Communauté et Région flamandes", d: "Parlement flamand (124 membres) et gouvernement flamand.", vote: 1, link: "communaute-flamande" },
      { c: C.prov, k: "Prov.", t: "Province d'Anvers", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Ville d'Anvers", d: "Conseil communal élu ; la ville est la plus peuplée du pays.", vote: 1, link: "commune" },
      { c: C.loc, k: "Dist.", t: "District (Borgerhout, Deurne, Merksem…)", d: "Depuis 2001, les neuf districts d'Anvers ont un conseil élu le même jour que le conseil communal : un étage de plus à la lasagne.", vote: 1, link: "commune" },
    ],
  },
  liege: {
    name: "Liège",
    blurb: "Chef-lieu de la province de Liège, en région de langue française.",
    layers: [
      EU("francophone", 8),
      FED("de Liège", 14),
      { c: C.com, k: "FWB", t: "Communauté française (Fédération Wallonie-Bruxelles)", d: "Son Parlement (94 membres) n'est pas élu directement : il réunit les 75 députés wallons et 19 députés bruxellois francophones.", vote: 0, link: "communaute-francaise" },
      { c: C.reg, k: "Rég.", t: "Région wallonne", d: "Parlement de Wallonie (75 membres) et gouvernement wallon, qui exercent aussi certaines compétences cédées par la Communauté française (accords de la Sainte-Émilie et de la Saint-Quentin).", vote: 1, link: "region-wallonne" },
      { c: C.prov, k: "Prov.", t: "Province de Liège", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Ville de Liège", d: "Conseil communal élu, CPAS, zone de police, zone de secours et intercommunales.", vote: 1, link: "commune" },
    ],
  },
  namur: {
    name: "Namur",
    blurb: "Capitale de la Wallonie : siège du Parlement et du gouvernement wallons.",
    layers: [
      EU("francophone", 8),
      FED("de Namur", 7),
      { c: C.com, k: "FWB", t: "Communauté française (Fédération Wallonie-Bruxelles)", d: "Compétente pour l'enseignement, la culture, les médias et le sport.", vote: 0, link: "communaute-francaise" },
      { c: C.reg, k: "Rég.", t: "Région wallonne", d: "Parlement de Wallonie et gouvernement wallon, installés à Namur.", vote: 1, link: "region-wallonne" },
      { c: C.prov, k: "Prov.", t: "Province de Namur", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Ville de Namur", d: "Conseil communal élu.", vote: 1, link: "commune" },
    ],
  },
  ixelles: {
    name: "Ixelles",
    blurb: "L'une des 19 communes de la Région bilingue de Bruxelles-Capitale.",
    layers: [
      EU("Vous élisez des députés européens dans le collège francophone (8 sièges) ou néerlandophone (13 sièges), au choix."),
      FED("de Bruxelles-Capitale", 16),
      { c: C.com, k: "2 Com.", t: "Communautés française et flamande", d: "Toutes deux sont compétentes à Bruxelles pour leurs institutions (écoles, culture). Les Bruxellois ne choisissent pas de « sous-nationalité » : ils choisissent une école, un hôpital, une liste.", vote: 0, link: "communaute" },
      { c: C.reg, k: "Rég.", t: "Région de Bruxelles-Capitale", d: "Parlement de 89 membres (72 du groupe français, 17 du groupe néerlandais) : l'électeur vote pour une liste francophone ou néerlandophone. Les électeurs néerlandophones élisent aussi six membres du Parlement flamand.", vote: 1, link: "region-de-bruxelles-capitale" },
      { c: C.bxl, k: "Cocof", t: "Commission communautaire française (COCOF)", d: "Composée des 72 députés du groupe français ; elle adopte des décrets dans les matières que lui a cédées la Communauté française.", vote: 0, link: "cocof" },
      { c: C.bxl, k: "VGC", t: "Vlaamse Gemeenschapscommissie (VGC)", d: "Composée des 17 députés du groupe néerlandais ; elle agit pour la Communauté flamande à Bruxelles.", vote: 0, link: "vgc" },
      { c: C.bxl, k: "Cocom", t: "Commission communautaire commune (COCOM)", d: "Compétente pour les matières « bicommunautaires » : allocations familiales, aide aux personnes, santé.", vote: 0, link: "cocom" },
      { c: C.loc, k: "Com.", t: "Commune d'Ixelles", d: "Conseil communal élu. Pas de province : le territoire de Bruxelles-Capitale n'en fait plus partie depuis la scission du Brabant en 1995.", vote: 1, link: "les-19-communes" },
    ],
  },
  eupen: {
    name: "Eupen",
    blurb: "Siège des institutions de la Communauté germanophone, en région de langue allemande (avec facilités pour les francophones).",
    layers: [
      EU("germanophone", 1),
      FED("de Liège", 14),
      { c: C.com, k: "DG", t: "Communauté germanophone (Ostbelgien)", d: "Parlement de 25 membres élu directement et gouvernement ; la Région wallonne lui a aussi transféré l'exercice de compétences régionales (emploi, monuments et sites, tutelle sur les communes…).", vote: 1, link: "communaute-germanophone" },
      { c: C.reg, k: "Rég.", t: "Région wallonne", d: "Les habitants élisent aussi le Parlement de Wallonie, dont les élus germanophones ne siègent pas au Parlement de la Fédération Wallonie-Bruxelles.", vote: 1, link: "region-wallonne" },
      { c: C.prov, k: "Prov.", t: "Province de Liège", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Ville d'Eupen", d: "Conseil communal élu.", vote: 1, link: "commune" },
    ],
  },
  rhode: {
    name: "Rhode-Saint-Genèse",
    blurb: "Commune à facilités de la périphérie bruxelloise, en Région flamande.",
    layers: [
      EU("Vous élisez des députés européens dans le collège néerlandophone ou francophone, au choix : une garantie maintenue pour ces communes lors de la scission de BHV."),
      FED("Vous élisez la Chambre en votant soit pour des listes du Brabant flamand (15 sièges), soit pour des listes de Bruxelles-Capitale (16 sièges) : depuis la scission de BHV en 2012, les électeurs des six communes à facilités ont ce choix."),
      { c: C.com, k: "Fl.", t: "Communauté et Région flamandes", d: "Parlement flamand et gouvernement flamand. Les francophones bénéficient de facilités linguistiques (documents administratifs en français, écoles francophones).", vote: 1, link: "communes-a-facilites" },
      { c: C.prov, k: "Prov.", t: "Province du Brabant flamand", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Commune de Rhode-Saint-Genèse", d: "Conseil communal élu. La nomination des bourgmestres de la périphérie, soumise au gouvernement flamand, a été source de conflits.", vote: 1, link: "bourgmestres-non-nommes" },
    ],
  },
  fourons: {
    name: "Fourons",
    blurb: "Commune à facilités transférée de la province de Liège au Limbourg en 1963.",
    layers: [
      EU("Vous élisez des députés européens."),
      FED("Vous élisez des membres de la Chambre des représentants."),
      { c: C.com, k: "Fl.", t: "Communauté et Région flamandes", d: "Les Fourons sont une enclave de la Région flamande entre la province de Liège et les Pays-Bas ; les francophones y bénéficient de facilités.", vote: 1, link: "fourons" },
      { c: C.prov, k: "Prov.", t: "Province de Limbourg", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Commune de Fourons (Voeren)", d: "Conseil communal élu ; la commune a symbolisé le conflit communautaire dans les années 1980.", vote: 1, link: "fourons" },
    ],
  },
  mouscron: {
    name: "Mouscron",
    blurb: "Commune à facilités pour les néerlandophones, rattachée au Hainaut en 1963.",
    layers: [
      EU("francophone", 8),
      FED("du Hainaut", 17),
      { c: C.com, k: "FWB", t: "Communauté française (Fédération Wallonie-Bruxelles)", d: "Compétente pour l'enseignement, la culture et les médias.", vote: 0, link: "communaute-francaise" },
      { c: C.reg, k: "Rég.", t: "Région wallonne", d: "Parlement de Wallonie et gouvernement wallon.", vote: 1, link: "region-wallonne" },
      { c: C.prov, k: "Prov.", t: "Province de Hainaut", d: "Conseil provincial élu.", vote: 1, link: "province" },
      { c: C.loc, k: "Com.", t: "Ville de Mouscron", d: "Conseil communal élu ; les néerlandophones bénéficient de facilités.", vote: 1, link: "communes-a-facilites" },
    ],
  },
};

let known = new Set();

function render(id) {
  const c = COMMUNES[id] || COMMUNES.gand;
  const stage = root.querySelector("[data-stage]");
  const levels = c.layers.length;
  const ballots = c.layers.reduce((a, l) => a + (l.vote || 0), 0);
  const stack = el(
    "div",
    { class: "layer-stack" },
    c.layers.map((l, i) =>
      el(
        "div",
        { class: "layer", style: { animationDelay: `${i * 0.08}s` } },
        el("div", { class: "lvl", style: { background: l.c }, "aria-hidden": "true" }, el("small", {}, l.k)),
        el(
          "div",
          {},
          el("h3", {}, known.has(l.link) ? el("a", { href: url(`/notions/${l.link}/`) }, l.t) : l.t, l.vote ? el("span", { class: "badge badge-green", style: { marginLeft: "0.5rem" } }, "élu par vous") : ""),
          el("p", {}, l.d),
        ),
      ),
    ),
  );
  stage.replaceChildren(
    el("h2", {}, `Vivre à ${c.name}`),
    el("p", { class: "lead" }, c.blurb),
    el("p", { class: "score-line" }, el("span", { class: "stat-pill" }, `${levels} étages de pouvoir`), el("span", { class: "stat-pill" }, `${ballots} bulletins de vote différents`)),
    stack,
  );
  root.querySelectorAll("[data-commune]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.commune === id)));
  history.replaceState(null, "", `${location.pathname}?commune=${id}`);
}

async function init() {
  if (!root) return;
  try {
    const r = await fetch(url("/data/notions.json"));
    known = new Set((await r.json()).data.map((n) => n.s));
  } catch (e) {
    /* liens désactivés hors ligne */
  }
  const nav = root.querySelector("[data-communes]");
  for (const [id, c] of Object.entries(COMMUNES)) nav.append(el("button", { type: "button", class: "chip", dataset: { commune: id }, "aria-pressed": "false", onclick: () => render(id) }, c.name));
  render(params().get("commune") || "gand");
  update((s) => {
    s.games.lasagne = (s.games.lasagne || 0) + 1;
  });
}

init();
