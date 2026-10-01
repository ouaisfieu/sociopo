// Généalogie des partis : frise 1840-2026, filiations (prédécesseurs → successeurs).
import { getJSON, svgEl, el, url } from "./_ui.js";

const root = document.querySelector("[data-genealogie]");
const FAMILY_ORDER = ["gauche-radicale", "socialiste", "ecologiste", "regionaliste", "chretienne-democrate", "liberale", "regionaliste_de", "nationaliste-flamande", "populiste", "extreme-droite", "autre"];
const Y0 = 1840;
const Y1 = 2026;

function lineage(slug, bySlug) {
  const out = new Set([slug]);
  const up = (s) => (bySlug[s]?.predecessors || []).forEach((p) => !out.has(p) && (out.add(p), up(p)));
  const down = (s) => (bySlug[s]?.successors || []).forEach((p) => !out.has(p) && (out.add(p), down(p)));
  up(slug);
  down(slug);
  return out;
}

async function init() {
  if (!root) return;
  let partis;
  try {
    partis = (await getJSON("/data/partis.json")).data.filter((p) => p.from);
  } catch (e) {
    return;
  }
  const bySlug = Object.fromEntries(partis.map((p) => [p.slug, p]));
  const rows = [...partis].sort((a, b) => {
    const fa = FAMILY_ORDER.indexOf(a.family);
    const fb = FAMILY_ORDER.indexOf(b.family);
    return (fa < 0 ? 99 : fa) - (fb < 0 ? 99 : fb) || a.from - b.from || a.title.localeCompare(b.title, "fr");
  });
  const left = 12;
  const W = 1180;
  const rowH = 24;
  const headH = 22;
  const top = 34;
  // Positions verticales : une ligne d'en-tête par famille, puis une ligne par parti
  const yOf = new Map();
  const heads = [];
  let yy = top;
  let prevFam = null;
  for (const p of rows) {
    if (p.family !== prevFam) {
      heads.push({ label: p.familyLabel || p.family, y: yy });
      yy += headH;
      prevFam = p.family;
    }
    yOf.set(p.slug, yy);
    yy += rowH;
  }
  const H = yy + 24;
  const x = (y) => left + ((y - Y0) / (Y1 - Y0)) * (W - left - 12);
  const svg = svgEl("svg", { width: W, height: H, viewBox: `0 0 ${W} ${H}`, role: "img", "aria-labelledby": "gen-title" });
  const title = svgEl("title", { id: "gen-title" });
  title.textContent = "Frise des partis politiques belges de 1840 à 2026, avec leurs filiations";
  svg.append(title);
  // Axe des décennies
  for (let y = 1840; y <= 2020; y += 20) {
    svg.append(svgEl("line", { x1: x(y), x2: x(y), y1: top - 8, y2: H - 16, stroke: "var(--line)", "stroke-width": 1 }));
    const t = svgEl("text", { x: x(y), y: top - 14, "text-anchor": "middle", "font-size": 11, fill: "var(--muted)" });
    t.textContent = String(y);
    svg.append(t);
  }
  heads.forEach((h, k) => {
    const next = heads[k + 1] ? heads[k + 1].y : H - 20;
    if (k % 2 === 0) svg.prepend(svgEl("rect", { x: 0, y: h.y - 2, width: W, height: next - h.y, fill: "var(--surface-2)", opacity: 0.6 }));
    const lbl = svgEl("text", { x: left, y: h.y + 14, "font-size": 10.5, "font-weight": 750, fill: "var(--muted)", "letter-spacing": "0.06em" });
    lbl.textContent = String(h.label).toUpperCase();
    svg.append(lbl);
  });
  // Liens de filiation
  const linkLayer = svgEl("g", { fill: "none" });
  svg.append(linkLayer);
  const links = [];
  for (const p of rows) {
    for (const pre of p.predecessors) {
      const q = bySlug[pre];
      if (!q) continue;
      const xa = x(Math.min(q.to || Y1, p.from));
      const ya = yOf.get(q.slug) + 8;
      const xb = x(p.from);
      const yb = yOf.get(p.slug) + 8;
      const path = svgEl("path", { d: `M${xa},${ya} C${xa + 18},${ya} ${xb - 18},${yb} ${xb},${yb}`, stroke: "var(--muted)", "stroke-width": 1.4, opacity: 0.55, "data-a": q.slug, "data-b": p.slug });
      links.push(path);
      linkLayer.append(path);
    }
  }
  // Barres
  const tip = root.querySelector("[data-tip]");
  const bars = [];
  rows.forEach((p) => {
    const y = yOf.get(p.slug);
    const xa = x(p.from);
    const xb = x(p.to || Y1);
    const g = svgEl("g", { class: "bar", tabindex: 0, role: "link", "aria-label": `${p.title} (${p.from}–${p.to || "aujourd'hui"})`, "data-slug": p.slug });
    const rect = svgEl("rect", { x: xa, y, width: Math.max(4, xb - xa), height: 16, rx: 4, style: `fill: var(--p-${p.slug}, var(--muted))` });
    if (!p.to) rect.setAttribute("stroke", "var(--ink)"), rect.setAttribute("stroke-width", 0), g.append(svgEl("circle", { cx: xb, cy: y + 8, r: 3, fill: "var(--ink)" }));
    const label = svgEl("text", { y: y + 12.5, "font-size": 11.5, "font-weight": 650 });
    label.textContent = p.short;
    const inside = xb - xa > p.short.length * 7 + 10;
    const before = !inside && xb + p.short.length * 7 + 10 > W;
    label.setAttribute("x", inside ? xa + 6 : before ? xa - 6 : xb + 6);
    if (before) label.setAttribute("text-anchor", "end");
    label.setAttribute("fill", inside ? "#fff" : "var(--ink)");
    if (inside) label.setAttribute("style", "paint-order:stroke;stroke:rgba(0,0,0,.35);stroke-width:2.5px");
    g.prepend(rect);
    g.append(label);
    const go = () => (location.href = url(p.url));
    g.addEventListener("click", go);
    g.addEventListener("keydown", (e) => e.key === "Enter" && go());
    const show = (e) => {
      highlight(p.slug);
      tip.replaceChildren(el("b", {}, p.title), el("span", {}, ` · ${p.founded || p.from}${p.to ? ` – ${p.dissolved || p.to}` : " – aujourd'hui"}`), el("p", { class: "small" }, p.summary || ""));
      tip.hidden = false;
    };
    g.addEventListener("mouseenter", show);
    g.addEventListener("focus", show);
    g.addEventListener("mouseleave", () => highlight(location.hash.slice(1) || null));
    bars.push(g);
    svg.append(g);
  });

  function highlight(slug) {
    const set = slug && bySlug[slug] ? lineage(slug, bySlug) : null;
    for (const g of bars) g.style.opacity = !set || set.has(g.dataset.slug) ? 1 : 0.25;
    for (const l of links) {
      const on = set && set.has(l.dataset.a) && set.has(l.dataset.b);
      l.setAttribute("opacity", !set ? 0.55 : on ? 1 : 0.1);
      l.setAttribute("stroke", on ? "var(--ink)" : "var(--muted)");
      l.setAttribute("stroke-width", on ? 2.2 : 1.4);
    }
  }
  const wrap = root.querySelector("[data-chart]");
  wrap.replaceChildren(svg);
  const initial = location.hash.slice(1);
  if (initial && bySlug[initial]) {
    highlight(initial);
    const py = yOf.get(initial);
    wrap.scrollLeft = Math.max(0, x(bySlug[initial].from) - 200);
    setTimeout(() => window.scrollTo({ top: wrap.getBoundingClientRect().top + window.scrollY + py - 200, behavior: "smooth" }), 200);
  }
  window.addEventListener("hashchange", () => highlight(location.hash.slice(1)));
}

init();
