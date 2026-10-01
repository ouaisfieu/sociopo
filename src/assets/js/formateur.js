// Le jeu du formateur : composer une coalition après les élections de 2024 et négocier un accord.
// Positions volontairement simplifiées, à visée ludique (voir l'avertissement sur la page).
import { el, url, shuffle } from "./_ui.js";
import { update, load } from "./_store.js";

const root = document.querySelector("[data-formateur]");

const PARTIES = [
  { id: "n-va", label: "N-VA", seats: 24, nl: 24, fr: 0 },
  { id: "vlaams-belang", label: "Vlaams Belang", seats: 20, nl: 20, fr: 0 },
  { id: "mr", label: "MR", seats: 20, nl: 0, fr: 20 },
  { id: "ps", label: "PS", seats: 16, nl: 0, fr: 16 },
  { id: "ptb-pvda", label: "PTB-PVDA", seats: 15, nl: 8, fr: 7 },
  { id: "les-engages", label: "Les Engagés", seats: 14, nl: 0, fr: 14 },
  { id: "vooruit", label: "Vooruit", seats: 13, nl: 13, fr: 0 },
  { id: "cd-v", label: "CD&V", seats: 11, nl: 11, fr: 0 },
  { id: "anders", label: "Open Vld", seats: 7, nl: 7, fr: 0 },
  { id: "groen", label: "Groen", seats: 6, nl: 6, fr: 0 },
  { id: "ecolo", label: "Ecolo", seats: 3, nl: 0, fr: 3 },
  { id: "defi", label: "DéFI", seats: 1, nl: 0, fr: 1 },
];

// Préférences pour les options A, B, C de chaque dossier (de -2 à +2) et priorités (×1,5).
const PREFS = {
  "n-va": { budget: [-1, 1, 2], fisc: [-2, 0, 2], pensions: [-1, 1, 2], chomage: [-2, 1, 2], etat: [-2, 0, 2], migration: [-2, 1, 2], energie: [-2, 1, 2], index: [-1, 1, 1], prio: ["etat", "chomage"] },
  "vlaams-belang": { budget: [-1, 1, 1], fisc: [-1, 1, 1], pensions: [1, 0, -1], chomage: [-2, 0, 2], etat: [-2, -1, 2], migration: [-2, -1, 2], energie: [-1, 1, 2], index: [1, 1, -1], prio: ["migration", "etat"] },
  mr: { budget: [-1, 1, 2], fisc: [-2, 0, 2], pensions: [-1, 1, 2], chomage: [-2, 1, 2], etat: [1, 0, -2], migration: [-1, 1, 1], energie: [-2, 1, 2], index: [1, 1, -1], prio: ["fisc", "chomage"] },
  ps: { budget: [2, 0, -2], fisc: [2, 1, -2], pensions: [2, -1, -2], chomage: [2, -1, -2], etat: [1, 0, -2], migration: [1, 0, -2], energie: [1, 0, -1], index: [2, 0, -2], prio: ["pensions", "index"] },
  "ptb-pvda": { budget: [2, -1, -2], fisc: [2, 0, -2], pensions: [2, -2, -2], chomage: [2, -2, -2], etat: [1, 0, -2], migration: [1, 0, -2], energie: [1, 0, -1], index: [2, -1, -2], prio: ["fisc", "index"] },
  "les-engages": { budget: [0, 2, 0], fisc: [0, 1, 0], pensions: [0, 1, 0], chomage: [-1, 2, 0], etat: [1, 1, -2], migration: [0, 2, -1], energie: [-1, 2, 1], index: [1, 1, -2], prio: ["chomage", "budget"] },
  vooruit: { budget: [1, 1, -1], fisc: [2, 1, -2], pensions: [1, 1, -1], chomage: [0, 1, -1], etat: [0, 1, -2], migration: [0, 1, -1], energie: [-1, 1, 0], index: [2, 1, -2], prio: ["fisc", "index"] },
  "cd-v": { budget: [0, 2, 0], fisc: [0, 2, -1], pensions: [0, 1, 0], chomage: [-1, 2, 0], etat: [0, 2, -1], migration: [0, 2, -1], energie: [-1, 2, 1], index: [1, 1, -1], prio: ["budget", "fisc"] },
  anders: { budget: [-1, 1, 2], fisc: [-2, 0, 1], pensions: [-1, 1, 2], chomage: [-2, 1, 2], etat: [0, 1, -1], migration: [0, 1, 0], energie: [-2, 1, 2], index: [0, 1, 0], prio: ["budget", "energie"] },
  groen: { budget: [1, 1, -2], fisc: [2, 1, -2], pensions: [1, 0, -2], chomage: [1, 0, -2], etat: [1, 1, -2], migration: [2, 0, -2], energie: [2, -1, -2], index: [2, 0, -2], prio: ["energie", "migration"] },
  ecolo: { budget: [1, 1, -2], fisc: [2, 1, -2], pensions: [1, 0, -2], chomage: [1, 0, -2], etat: [1, 0, -2], migration: [2, 0, -2], energie: [2, -1, -2], index: [2, 0, -2], prio: ["energie", "migration"] },
  defi: { budget: [0, 1, 0], fisc: [1, 1, -1], pensions: [1, 0, -1], chomage: [0, 1, -1], etat: [2, -1, -2], migration: [1, 1, -1], energie: [-1, 1, 1], index: [2, 0, -2], prio: ["etat", "index"] },
};

const DOSSIERS = [
  { id: "budget", title: "Le budget", ctx: "La Belgique est sous procédure européenne de déficit excessif. Quelle trajectoire budgétaire ?", opts: ["Assainissement lent, protégeant les investissements et la sécurité sociale", "Effort équilibré entre économies et nouvelles recettes", "Assainissement rapide, surtout par des économies"], days: 25, link: "deficit-public" },
  { id: "fisc", title: "La fiscalité", ctx: "Qui contribue ? La question de la taxation du capital divise la droite et la gauche.", opts: ["Impôt sur les grandes fortunes", "Taxe modérée sur les plus-values, baisse de l'impôt sur le travail", "Baisse des impôts sur le travail sans nouvelle taxe sur le capital"], days: 30, link: "taxe-sur-les-plus-values" },
  { id: "pensions", title: "Les pensions", ctx: "Le vieillissement pèse sur les finances publiques. Faut-il réformer ?", opts: ["Pension minimum relevée, âge légal inchangé", "Bonus-malus pour encourager à travailler plus longtemps", "Durcissement de la pension anticipée et alignement des régimes"], days: 20, link: "reforme-des-pensions-2025" },
  { id: "chomage", title: "Le chômage", ctx: "La Belgique est l'un des rares pays où les allocations de chômage ne sont pas limitées dans le temps.", opts: ["Allocations illimitées, accompagnement renforcé", "Limitation dans le temps avec des exceptions", "Limitation stricte à deux ans"], days: 20, link: "limitation-des-allocations-de-chomage-dans-le-temps" },
  { id: "etat", title: "La réforme de l'État", ctx: "Les nationalistes flamands veulent le confédéralisme ; les francophones n'en veulent pas.", opts: ["Pas de réforme institutionnelle", "Réforme ciblée : compétences plus homogènes, refédéralisations possibles", "Cap sur le confédéralisme"], days: 35, link: "prochaine-reforme-de-l-etat" },
  { id: "migration", title: "L'asile et la migration", ctx: "La crise de l'accueil a laissé des demandeurs d'asile à la rue pendant des mois.", opts: ["Accueil élargi et voies de migration légale", "Politique « stricte mais humaine »", "Fermeture maximale et moratoire"], days: 15, link: "crise-de-l-accueil" },
  { id: "energie", title: "L'énergie", ctx: "La loi de 2003 prévoit la sortie du nucléaire. Faut-il la maintenir ?", opts: ["Sortie du nucléaire maintenue", "Prolongation des réacteurs existants", "Relance : abrogation de la loi et nouvelles centrales"], days: 15, link: "sortie-du-nucleaire" },
  { id: "index", title: "Les salaires", ctx: "L'indexation automatique protège le pouvoir d'achat mais coûte cher aux employeurs.", opts: ["Indexation intégrale et hausse du salaire minimum", "Indexation maintenue, modération salariale encadrée", "Saut d'index"], days: 15, link: "indexation-automatique" },
];

const EVENTS = [
  { t: "Les élections communales d'octobre gèlent les négociations : aucun président ne veut faire de concessions avant le scrutin.", days: 25, all: 0 },
  { t: "Une note de travail fuite dans la presse. Les partenaires s'accusent mutuellement.", days: 5, all: -5 },
  { t: "Le Roi vous reçoit au Palais et prolonge votre mission. Les partenaires apprécient votre persévérance.", days: 3, all: 4 },
  { t: "Un président de parti rejette votre « super-note » à la télévision. Il faut tout reprendre.", days: 20, one: -10 },
  { t: "Les agences de notation s'inquiètent de l'absence de gouvernement : la pression monte pour conclure.", days: 0, all: 3 },
  { t: "Conclave de week-end au château de Val Duchesse : on avance enfin.", days: -5, all: 2 },
  { t: "Une manifestation syndicale nationale traverse Bruxelles.", days: 3, one: -6 },
];

let G = null;

const byId = Object.fromEntries(PARTIES.map((p) => [p.id, p]));
const totals = (ids) => ids.reduce((a, id) => ({ seats: a.seats + byId[id].seats, nl: a.nl + byId[id].nl, fr: a.fr + byId[id].fr }), { seats: 0, nl: 0, fr: 0 });

function screen(...children) {
  const stage = root.querySelector("[data-stage]");
  stage.replaceChildren(...children);
  stage.scrollIntoView({ behavior: "smooth", block: "start" });
}

function intro() {
  G = { picked: new Set(), sat: {}, days: 0, log: [], jokers: 2, step: 0, choices: {} };
  screen(
    el("p", { class: "eyebrow" }, "9 juin 2024, 23 h 40"),
    el("p", { class: "story" }, "Les résultats du « méga-scrutin » tombent : la N-VA reste le premier parti, le Vlaams Belang progresse, le MR et Les Engagés triomphent en Wallonie, Ecolo s'effondre. Le lendemain, le Roi entame ses consultations au Palais. Quelques jours plus tard, il vous confie une mission : former un gouvernement fédéral."),
    el("p", { class: "story" }, "Première étape : choisir les partis avec lesquels négocier. Il vous faut au moins 76 sièges sur 150, et de préférence une majorité dans chaque groupe linguistique (45 néerlandophones sur 89, 31 francophones sur 61)."),
    el("button", { type: "button", class: "btn", onclick: pick }, "Composer ma coalition →"),
  );
}

function pick() {
  const list = el("div", { class: "party-toggles" });
  const status = el("div", { "aria-live": "polite" });
  const go = el("button", { type: "button", class: "btn", disabled: true, onclick: begin }, "Ouvrir les négociations →");
  const refresh = () => {
    const t = totals([...G.picked]);
    const okMaj = t.seats >= 76;
    status.replaceChildren(
      el("p", { class: "score-line" }, el("span", { class: "stat-pill" }, `${t.seats} / 150 sièges`), el("span", { class: "stat-pill" }, `NL ${t.nl} / 89`), el("span", { class: "stat-pill" }, `FR ${t.fr} / 61`)),
      el("p", { class: `verdict ${okMaj ? (t.nl >= 45 && t.fr >= 31 ? "ok" : "warn") : "ko"}` }, okMaj ? (t.nl >= 45 && t.fr >= 31 ? "Majorité dans les deux groupes linguistiques." : "Majorité absolue, mais minoritaire dans un groupe linguistique : votre légitimité en souffrira.") : `Il manque ${76 - t.seats} siège${76 - t.seats > 1 ? "s" : ""}.`),
    );
    go.disabled = !okMaj;
  };
  for (const p of PARTIES) {
    const b = el(
      "button",
      { type: "button", class: "party-toggle", "aria-pressed": String(G.picked.has(p.id)), style: `--party: var(--p-${p.id})` },
      el("span", { class: "party-swatch", style: `background: var(--p-${p.id})` }),
      el("span", {}, p.label, el("small", { class: "muted" }, ` · ${p.nl && p.fr ? "NL+FR" : p.nl ? "NL" : "FR"}`)),
      el("span", { class: "seats" }, String(p.seats)),
    );
    b.addEventListener("click", () => {
      if (G.picked.has(p.id)) G.picked.delete(p.id);
      else G.picked.add(p.id);
      b.setAttribute("aria-pressed", String(G.picked.has(p.id)));
      refresh();
    });
    list.append(b);
  }
  refresh();
  screen(el("h2", { class: "h3" }, "Avec qui négocier ?"), el("div", { class: "grid grid-2" }, list, el("div", {}, status, go)));
}

function begin() {
  const ids = [...G.picked];
  const refusals = [];
  if (ids.includes("vlaams-belang") && ids.length > 1) {
    for (const id of ids) if (id !== "vlaams-belang") refusals.push([id, "refuse de négocier avec le Vlaams Belang (cordon sanitaire)"]);
  }
  if (ids.includes("ptb-pvda")) refusals.push(["ptb-pvda", "exige un « programme de rupture » et refuse de gouverner avec des partis favorables à l'austérité"]);
  if (refusals.length) {
    for (const [id] of refusals) G.picked.delete(id);
    G.days += 10;
  }
  const t = totals([...G.picked]);
  for (const id of G.picked) G.sat[id] = 60;
  G.days += 30; // consultations royales et mission d'information
  G.legit = t.nl >= 45 && t.fr >= 31 ? 0 : -10;
  const msgs = refusals.map(([id, why]) => el("li", {}, el("b", {}, byId[id].label), ` ${why}.`));
  if (t.seats < 76) {
    return screen(
      el("h2", { class: "h3" }, "Échec de la mission"),
      el("ul", {}, msgs),
      el("p", { class: "story" }, `Il ne vous reste que ${t.seats} sièges. Le Roi accepte votre démission et désigne un nouvel informateur.`),
      el("button", { type: "button", class: "btn", onclick: intro }, "Recommencer"),
    );
  }
  G.order = shuffle(DOSSIERS.map((d) => d.id)).slice(0, 6);
  screen(
    el("h2", { class: "h3" }, "Les négociations commencent"),
    msgs.length ? el("ul", {}, msgs) : "",
    el("p", { class: "story" }, `Après un mois de consultations et de mission d'information, votre coalition réunit ${[...G.picked].map((id) => byId[id].label).join(", ")} : ${t.seats} sièges. Six dossiers vous attendent. Chaque choix réjouit certains partenaires et en irrite d'autres ; un partenaire trop mécontent claquera la porte. Vous disposez de deux « compensations » (un poste de vice-Premier ministre, une présidence d'assemblée…) pour retenir un partenaire au bord de la rupture.`),
    el("button", { type: "button", class: "btn", onclick: dossier }, "Premier dossier →"),
  );
}

function satBars() {
  return el(
    "div",
    { class: "stack" },
    [...G.picked].map((id) =>
      el(
        "div",
        { class: "vs-row" },
        el("span", {}, byId[id].label),
        el("div", { class: "sat-bar", role: "meter", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": Math.round(G.sat[id]), "aria-label": `Satisfaction ${byId[id].label}` }, el("span", { style: { width: `${Math.max(0, Math.min(100, G.sat[id]))}%`, background: G.sat[id] < 30 ? "var(--brick)" : G.sat[id] < 50 ? "var(--ochre)" : "var(--green)" } })),
        el("span", { class: "v" }, `${Math.round(G.sat[id])} / 100`),
      ),
    ),
  );
}

function dossier() {
  if (G.step >= G.order.length) return finish();
  const d = DOSSIERS.find((x) => x.id === G.order[G.step]);
  const cards = d.opts.map((txt, k) => {
    const fans = [...G.picked].filter((id) => PREFS[id][d.id][k] === 2).map((id) => byId[id].label);
    const foes = [...G.picked].filter((id) => PREFS[id][d.id][k] === -2).map((id) => byId[id].label);
    return el(
      "button",
      { type: "button", class: "quiz-choice", onclick: () => decide(d, k) },
      el("span", { class: "letter", "aria-hidden": "true" }, "ABC"[k]),
      el(
        "span",
        {},
        el("b", {}, txt),
        el("br"),
        el("small", { class: "muted" }, fans.length ? `Enthousiasme : ${fans.join(", ")}. ` : "", foes.length ? `Ligne rouge : ${foes.join(", ")}.` : "", !fans.length && !foes.length ? "Pas de réaction tranchée." : ""),
      ),
    );
  });
  screen(
    el("div", { class: "quiz-top" }, el("span", {}, `Dossier ${G.step + 1} / ${G.order.length}`), el("span", { class: "stat-pill" }, `Jour ${Math.max(1, G.days)}`), el("span", { class: "stat-pill" }, `Compensations : ${G.jokers}`)),
    el("h2", { class: "h3" }, d.title),
    el("p", { class: "story" }, d.ctx),
    el("div", { class: "quiz-choices" }, cards),
    el("h3", { class: "h4", style: { marginTop: "1.4rem" } }, "Humeur des partenaires"),
    satBars(),
  );
}

function decide(d, k) {
  G.choices[d.id] = k;
  const prefs = [...G.picked].map((id) => PREFS[id][d.id][k]);
  const spread = Math.max(...prefs) - Math.min(...prefs);
  G.days += d.days + spread * 6;
  for (const id of G.picked) {
    const mult = PREFS[id].prio.includes(d.id) ? 1.5 : 1;
    G.sat[id] += PREFS[id][d.id][k] * 8 * mult;
  }
  G.log.push(`${d.title} : ${d.opts[k]}`);
  G.step++;
  // Événement aléatoire une fois sur deux
  let ev = null;
  if (Math.random() < 0.5) {
    ev = EVENTS[Math.floor(Math.random() * EVENTS.length)];
    G.days += ev.days;
    if (ev.all) for (const id of G.picked) G.sat[id] += ev.all;
    if (ev.one) {
      const victim = shuffle([...G.picked])[0];
      G.sat[victim] += ev.one;
      ev = { ...ev, t: `${ev.t} (${byId[victim].label})` };
    }
  }
  checkCrisis(ev);
}

function checkCrisis(ev) {
  const angry = [...G.picked].filter((id) => G.sat[id] < 25).sort((a, b) => G.sat[a] - G.sat[b]);
  const evEl = ev ? el("p", { class: "callout callout-actu" }, el("b", {}, "Rebondissement. "), ev.t) : "";
  if (!angry.length) return screen(evEl, el("h2", { class: "h3" }, "Accord sur ce dossier"), satBars(), el("button", { type: "button", class: "btn", onclick: dossier }, G.step < G.order.length ? "Dossier suivant →" : "Finaliser l'accord →"));
  const id = angry[0];
  const p = byId[id];
  const actions = el("div", { class: "cluster" });
  if (G.jokers > 0)
    actions.append(
      el("button", { type: "button", class: "btn", onclick: () => ((G.jokers -= 1), (G.sat[id] = 45), (G.days += 7), checkCrisis(null)) }, `Offrir une compensation à ${p.label}`),
    );
  actions.append(
    el("button", { type: "button", class: "btn btn-ghost", onclick: () => leave(id) }, `Laisser partir ${p.label}`),
  );
  screen(evEl, el("h2", { class: "h3" }, "Crise !"), el("p", { class: "story" }, `${p.label} menace de quitter la table des négociations : « Nos électeurs ne comprendraient pas. »`), satBars(), actions);
}

function leave(id) {
  G.picked.delete(id);
  delete G.sat[id];
  G.days += 12;
  const t = totals([...G.picked]);
  if (t.seats < 76) return fail(`${byId[id].label} quitte les négociations. Votre coalition tombe à ${t.seats} sièges.`);
  if (t.nl < 45 || t.fr < 31) G.legit = -10;
  checkCrisis(null);
}

function fail(msg) {
  update((s) => {
    s.games.formateur = { ...(s.games.formateur || {}), plays: ((s.games.formateur || {}).plays || 0) + 1 };
  });
  screen(
    el("h2", { class: "h3" }, "Le Roi accepte votre démission"),
    el("p", { class: "story" }, `${msg} Après ${G.days} jours, vous remettez votre rapport au Palais. Un nouvel informateur est désigné.`),
    el("p", { class: "muted" }, "Pour mémoire : il a fallu 541 jours en 2010-2011 et 494 jours en 2019-2020 pour former un gouvernement."),
    el("button", { type: "button", class: "btn", onclick: intro }, "Retenter ma chance"),
  );
}

function finish() {
  const ids = [...G.picked];
  const t = totals(ids);
  const minSat = Math.min(...ids.map((id) => G.sat[id]));
  const score = Math.max(0, Math.round(1000 - G.days * 1.5 + minSat * 3 + G.legit * 10));
  const prev = load().games.formateur || {};
  update((s) => {
    const p = s.games.formateur || {};
    s.games.formateur = { plays: (p.plays || 0) + 1, best: Math.max(p.best || 0, score), bestDays: Math.min(p.bestDays || 9999, G.days), formed: (p.formed || 0) + 1 };
  });
  const arizona = ["n-va", "mr", "les-engages", "vooruit", "cd-v"];
  const isArizona = ids.length === arizona.length && arizona.every((x) => ids.includes(x));
  screen(
    el("p", { class: "eyebrow" }, `Jour ${G.days}`),
    el("h2", {}, "Un gouvernement prête serment !"),
    el("p", { class: "story" }, `Votre coalition ${isArizona ? "« Arizona » " : ""}(${ids.map((id) => byId[id].label).join(", ")}) dispose de ${t.seats} sièges, dont ${t.nl} néerlandophones et ${t.fr} francophones. Elle a été formée en ${G.days} jours — contre 239 jours pour le gouvernement De Wever, entré en fonction le 3 février 2025.`),
    el("p", { class: "score-line" }, el("span", { class: "score-big" }, String(score)), el("span", { class: "muted" }, `points${prev.best ? ` · record précédent : ${prev.best}` : ""}`)),
    el("h3", { class: "h4" }, "Votre accord de gouvernement"),
    el("ul", {}, G.log.map((l) => el("li", {}, l))),
    el("h3", { class: "h4" }, "Humeur finale des partenaires"),
    satBars(),
    el("p", {}, "Comparez avec la réalité : ", el("a", { href: url("/gouvernements/de-wever/") }, "le gouvernement De Wever"), " et ", el("a", { href: url("/notions/formation-du-gouvernement/") }, "la formation du gouvernement"), "."),
    el("button", { type: "button", class: "btn", onclick: intro }, "Rejouer"),
  );
}

if (root) intro();
