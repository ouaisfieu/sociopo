// Simulateur de coalitions : sélection de partis, hémicycle, majorités par groupe linguistique,
// coalitions minimales gagnantes, comparaison avec la coalition réellement formée.
import { getJSON, el, svgEl, url, params, toast } from "./_ui.js";
import { seatPositions, assignSeats } from "../../../lib/hemicycle.js";
import { update } from "./_store.js";

const root = document.querySelector("[data-coalitions]");

// Coalitions célèbres (ensembles exacts de partis actuels).
const NAMED = [
  { name: "Arizona", set: ["n-va", "mr", "les-engages", "vooruit", "cd-v"], slug: "coalition-arizona" },
  { name: "Vivaldi", set: ["ps", "mr", "ecolo", "vooruit", "anders", "cd-v", "groen"], slug: "coalition-vivaldi" },
  { name: "Suédoise", set: ["n-va", "mr", "cd-v", "anders"], slug: "coalition-suedoise" },
  { name: "Azur", set: ["mr", "les-engages"] },
  { name: "Tripartite classique", set: ["ps", "vooruit", "mr", "anders", "cd-v", "les-engages"], slug: "tripartite" },
  { name: "Violette", set: ["ps", "vooruit", "mr", "anders"], slug: "coalition-violette" },
  { name: "Arc-en-ciel", set: ["ps", "vooruit", "mr", "anders", "ecolo", "groen"], slug: "coalition-arc-en-ciel" },
  { name: "Olivier", set: ["ps", "les-engages", "ecolo"], slug: "coalition-olivier" },
];

let assemblies = [];
let partyInfo = {};
let A = null; // assemblée courante
let selected = new Set();
let cordon = true;

const keyOf = (s) => s.key || s.party;

function info(slug) {
  return partyInfo[slug] || { short: slug, lr: 5, color: "#9a9890" };
}

function seatOrder(seats) {
  // Ordre de l'hémicycle : de gauche à droite selon la position (lr), puis groupe linguistique.
  return [...seats].sort((a, b) => info(a.party).lr - info(b.party).lr || (a.group || "").localeCompare(b.group || ""));
}

function tally(keys = selected) {
  const t = { total: 0, groups: {} };
  for (const s of A.seats) {
    if (!keys.has(keyOf(s))) continue;
    t.total += s.seats;
    if (A.byGroup) t.groups[s.group] = (t.groups[s.group] || 0) + s.seats;
    else if (A.split && A.split[s.party]) for (const [g, n] of Object.entries(A.split[s.party])) t.groups[g] = (t.groups[g] || 0) + n;
  }
  return t;
}

function wins(t) {
  if (t.total < A.majority) return false;
  if (A.byGroup) return Object.entries(A.groups).every(([g, d]) => (t.groups[g] || 0) > d.total / 2);
  return true;
}

function drawHemicycle() {
  const ordered = seatOrder(A.seats);
  const pos = seatPositions(A.total);
  const parties = ordered.map((s) => ({ ...s, color: `var(--p-${s.party}, #9a9890)` }));
  const seats = assignSeats(parties, pos);
  const svg = svgEl("svg", { class: "hemicycle", viewBox: "-1.06 -1.08 2.12 1.2", role: "img", "aria-label": `Hémicycle : ${A.name}` });
  for (const s of seats) {
    const on = selected.has(keyOf(s.party));
    const c = svgEl("circle", { class: `seat${on ? "" : " dim"}`, cx: s.x.toFixed(4), cy: s.y.toFixed(4), r: s.r.toFixed(4), style: `fill:${s.party.color}` });
    const title = svgEl("title");
    title.textContent = `${s.party.label}${s.party.group ? ` (groupe ${s.party.group === "fr" ? "français" : "néerlandais"})` : ""} — ${s.party.seats} siège${s.party.seats > 1 ? "s" : ""}`;
    c.append(title);
    c.addEventListener("click", () => toggle(keyOf(s.party)));
    svg.append(c);
  }
  svg.append(svgEl("line", { class: "majority-line", x1: 0, y1: -1.04, x2: 0, y2: -0.3 }));
  const t = tally();
  const big = svgEl("text", { x: 0, y: -0.06, "text-anchor": "middle", "font-size": 0.16, "font-weight": 700 });
  big.textContent = String(t.total);
  const small = svgEl("text", { x: 0, y: 0.07, "text-anchor": "middle", "font-size": 0.065, opacity: 0.7 });
  small.textContent = `sur ${A.total} · majorité ${A.majority}`;
  svg.append(big, small);
  return svg;
}

function meter(label, value, total, need) {
  const pct = Math.min(100, (value / total) * 100);
  return el(
    "div",
    { class: "field" },
    el("label", {}, `${label} : `, el("b", {}, `${value} / ${total}`), ` (majorité : ${need})`),
    el(
      "div",
      { class: "meter", role: "meter", "aria-valuemin": 0, "aria-valuemax": total, "aria-valuenow": value, "aria-label": label },
      el("div", { class: "fill", style: { width: `${pct}%`, background: value >= need ? "var(--green)" : "var(--accent)" } }),
      el("div", { class: "mark", style: { left: `${(need / total) * 100}%` } }),
    ),
  );
}

function namedMatch() {
  const plain = new Set([...selected].map((k) => k.split("@")[0]));
  return NAMED.find((n) => n.set.length === plain.size && n.set.every((p) => plain.has(p)));
}

function minimalWinning() {
  let pool = A.seats.filter((s) => !(cordon && ["vlaams-belang"].includes(s.party)));
  // Bruxelles : on raisonne par parti (les deux groupes ensemble) pour rester lisible.
  const units = [];
  const byParty = {};
  for (const s of pool) (byParty[s.party] ||= []).push(s);
  for (const [party, list] of Object.entries(byParty)) units.push({ party, keys: list.map(keyOf), seats: list.reduce((a, b) => a + b.seats, 0) });
  const n = units.length;
  if (n > 16) return [];
  const res = [];
  for (let mask = 1; mask < 1 << n; mask++) {
    const keys = new Set();
    for (let i = 0; i < n; i++) if (mask & (1 << i)) units[i].keys.forEach((k) => keys.add(k));
    const t = tally(keys);
    if (!wins(t)) continue;
    let minimal = true;
    for (let i = 0; i < n && minimal; i++) {
      if (!(mask & (1 << i))) continue;
      const k2 = new Set(keys);
      units[i].keys.forEach((k) => k2.delete(k));
      if (wins(tally(k2))) minimal = false;
    }
    if (!minimal) continue;
    const members = units.filter((_, i) => mask & (1 << i));
    const lrs = members.map((m) => info(m.party).lr);
    res.push({ members, seats: t.total, span: Math.max(...lrs) - Math.min(...lrs), groups: t.groups });
  }
  return res.sort((a, b) => a.members.length - b.members.length || a.span - b.span || b.seats - a.seats).slice(0, 12);
}

let wonOnce = false;
function render() {
  const t = tally();
  const ok = wins(t);
  if (ok && !wonOnce) {
    wonOnce = true;
    update((s) => {
      s.games.coalitionWin = true;
    });
  }
  const stage = root.querySelector("[data-stage]");
  const side = root.querySelector("[data-side]");
  stage.replaceChildren();
  side.replaceChildren();

  stage.append(el("div", { class: "hemicycle-wrap" }, drawHemicycle()));
  const verdictText = ok
    ? `Majorité atteinte : ${t.total} sièges sur ${A.total}.`
    : selected.size
      ? `Pas de majorité : il manque ${Math.max(0, A.majority - t.total)} siège${A.majority - t.total > 1 ? "s" : ""}${t.total >= A.majority ? " dans un groupe linguistique" : ""}.`
      : "Sélectionnez des partis pour composer une coalition.";
  stage.append(el("p", { class: `verdict ${ok ? "ok" : selected.size ? "ko" : "warn"}`, role: "status" }, verdictText));

  const meters = el("div", { class: "stack" }, meter("Sièges de la coalition", t.total, A.total, A.majority));
  if (A.groups) {
    for (const [g, d] of Object.entries(A.groups)) meters.append(meter(d.label, t.groups[g] || 0, d.total, Math.floor(d.total / 2) + 1));
  }
  stage.append(meters);

  const notes = el("div", { class: "stack small" });
  if (A.split && !A.byGroup) {
    const nlOk = (t.groups.nl || 0) > A.groups.nl.total / 2;
    const frOk = (t.groups.fr || 0) > A.groups.fr.total / 2;
    if (ok && (!nlOk || !frOk))
      notes.append(el("p", { class: "callout callout-attention" }, `Coalition majoritaire, mais minoritaire dans le groupe ${!nlOk ? "néerlandais" : "français"} : aucune règle ne l'interdit, mais c'est politiquement sensible (gouvernement Di Rupo côté flamand, suédoise côté francophone).`));
    if (A.special) {
      const sp = t.total >= 100 && nlOk && frOk;
      notes.append(el("p", {}, sp ? "✔ Cette coalition atteindrait même la majorité spéciale (deux tiers et majorité dans chaque groupe) nécessaire à une réforme de l'État." : "Majorité spéciale (réforme de l'État) : il faudrait 100 voix et la majorité dans chaque groupe linguistique."));
    }
  }
  if (A.byGroup) notes.append(el("p", {}, "À Bruxelles, le gouvernement doit disposer d'une majorité dans chacun des deux groupes linguistiques : les ministres francophones et néerlandophones sont élus par leur groupe."));
  const named = namedMatch();
  if (named) notes.append(el("p", { class: "verdict ok" }, `C'est une coalition « ${named.name} » !`, named.slug ? el("a", { href: url(`/notions/${named.slug}/`), style: { marginLeft: "0.4rem" } }, "En savoir plus") : ""));
  if (selected.has("vlaams-belang") && selected.size > 1) notes.append(el("p", { class: "callout callout-debat" }, "Le cordon sanitaire : depuis la fin des années 1980, les autres partis s'engagent à ne pas gouverner avec le Vlaams Belang. Cette coalition est donc théorique."));
  if (A.formed) {
    notes.append(
      el(
        "p",
        {},
        "Coalition réellement formée : ",
        el("a", { href: url(`/gouvernements/${A.formed.id}/`) }, A.formed.name),
        A.formed.days ? ` (après ${A.formed.days} jours)` : "",
        " ",
        el("button", { class: "btn btn-small btn-ghost", type: "button", onclick: () => setSelection(A.formed.parties) }, "Afficher"),
      ),
    );
  }
  stage.append(notes);

  // Panneau latéral : partis
  side.append(el("h2", { class: "h4" }, "Partis"));
  const list = el("div", { class: "party-toggles" });
  for (const s of [...A.seats].sort((a, b) => b.seats - a.seats)) {
    const k = keyOf(s);
    list.append(
      el(
        "button",
        { type: "button", class: "party-toggle", "aria-pressed": String(selected.has(k)), style: `--party: var(--p-${s.party}, #9a9890)`, onclick: () => toggle(k) },
        el("span", { class: "party-swatch", style: `background: var(--p-${s.party}, #9a9890)` }),
        el("span", {}, s.label, s.group ? el("small", { class: "muted" }, ` · ${s.group.toUpperCase()}`) : ""),
        el("span", { class: "seats" }, String(s.seats)),
      ),
    );
  }
  side.append(list);
  side.append(
    el(
      "div",
      { class: "cluster", style: { marginTop: "0.8rem" } },
      el("button", { type: "button", class: "btn btn-small btn-ghost", onclick: () => setSelection([]) }, "Tout désélectionner"),
      el("button", { type: "button", class: "btn btn-small btn-ghost", onclick: share }, "Copier le lien"),
    ),
  );

  // Coalitions minimales gagnantes
  const mw = root.querySelector("[data-minimal]");
  mw.replaceChildren();
  const combos = minimalWinning();
  mw.append(
    el("h2", {}, "Coalitions minimales gagnantes"),
    el("p", { class: "muted small" }, "Coalitions majoritaires dont aucun membre ne peut être retiré sans perdre la majorité, classées par nombre de partis puis par écart idéologique (échelle gauche-droite indicative de 0 à 10)", cordon ? ", hors Vlaams Belang (cordon sanitaire)." : "."),
  );
  if (!combos.length) mw.append(el("p", { class: "empty-state" }, "Aucune combinaison trouvée."));
  const ul = el("ol", { class: "notice-list" });
  for (const c of combos) {
    const keys = c.members.flatMap((m) => m.keys);
    ul.append(
      el(
        "li",
        {},
        el(
          "button",
          { type: "button", class: "btn btn-small btn-ghost", onclick: () => setSelection(keys) },
          c.members.map((m) => info(m.party).short).join(" + "),
        ),
        el("p", {}, `${c.seats} sièges · ${c.members.length} partis · écart gauche-droite ${c.span.toFixed(1)}`),
      ),
    );
  }
  mw.append(ul);
  writeUrl();
}

function toggle(k) {
  if (selected.has(k)) selected.delete(k);
  else selected.add(k);
  render();
}

function setSelection(keys) {
  selected = new Set();
  for (const k of keys) {
    // Accepte « parti » ou « parti@groupe » (Bruxelles : un parti sélectionne ses deux groupes)
    for (const s of A.seats) if (keyOf(s) === k || s.party === k) selected.add(keyOf(s));
  }
  render();
}

function writeUrl() {
  const p = new URLSearchParams();
  p.set("a", A.id);
  if (selected.size) p.set("p", [...selected].join(","));
  history.replaceState(null, "", `${location.pathname}?${p}`);
}

function share() {
  const link = location.href;
  navigator.clipboard?.writeText(link).then(
    () => toast("Lien copié : partagez votre coalition !"),
    () => toast(link),
  );
}

function selectAssembly(id, keys = []) {
  A = assemblies.find((a) => a.id === id) || assemblies[0];
  root.querySelector("select[name=assemblee]").value = A.id;
  setSelection(keys);
}

async function init() {
  if (!root) return;
  try {
    const [pl, pa] = await Promise.all([getJSON("/data/parlements.json"), getJSON("/data/partis.json")]);
    assemblies = pl.data;
    for (const p of pa.data) partyInfo[p.slug] = { short: p.short, lr: p.lr ?? 5 };
  } catch (e) {
    root.querySelector("[data-stage]").textContent = "Impossible de charger les données.";
    return;
  }
  const sel = root.querySelector("select[name=assemblee]");
  const groupsOpt = {};
  for (const a of assemblies) {
    const g = (groupsOpt[a.year] ||= el("optgroup", { label: String(a.year) }));
    g.append(el("option", { value: a.id }, a.name));
  }
  Object.keys(groupsOpt)
    .sort((a, b) => b - a)
    .forEach((y) => sel.append(groupsOpt[y]));
  sel.addEventListener("change", () => selectAssembly(sel.value));
  root.querySelector("input[name=cordon]").addEventListener("change", (e) => {
    cordon = e.target.checked;
    render();
  });
  const q = params();
  selectAssembly(q.get("a") || "chambre-2024", (q.get("p") || "").split(",").filter(Boolean));
  update((s) => {
    s.games.coalitions = (s.games.coalitions || 0) + 1;
  });
}

init();
