// Graphe des notions : réseau des liens entre notices (d3-force, rendu canvas).
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from "d3-force";
import { getJSON, el, url, params } from "./_ui.js";
import { update } from "./_store.js";

const root = document.querySelector("[data-graphe]");

// Familles de thèmes → couleur (variables CSS du site, relues à chaque changement de thème)
const GROUPS = {
  institutions: ["institutions-federales", "parlement", "gouvernement", "monarchie", "justice-droits", "administration"],
  federalisme: ["federalisme", "reformes-etat", "pouvoirs-locaux", "bruxelles", "communautaire"],
  politique: ["elections", "partis", "medias-democratie"],
  societe: ["piliers-societe-civile", "travail-concertation", "protection-sociale", "economie-finances", "ethique-enseignement-cultes", "migrations-diversite", "energie-environnement"],
  histoire: ["histoire", "europe-international"],
};
const GROUP_LABEL = { institutions: "Institutions", federalisme: "Fédéralisme et territoires", politique: "Partis et élections", societe: "Société et économie", histoire: "Histoire et international" };
const GROUP_VAR = { institutions: "--accent", federalisme: "--green", politique: "--brick", societe: "--ochre", histoire: "--violet" };
const groupOf = (th) => Object.keys(GROUPS).find((g) => GROUPS[g].includes(th)) || "institutions";

let nodes = [];
let links = [];
let byId = new Map();
let neighbors = new Map();
let canvas, ctx, W, H, dpr;
let transform = { x: 0, y: 0, k: 1 };
let hover = null;
let selected = null;
let filterGroup = "";
let colors = {};
let previews = {};

function readColors() {
  const cs = getComputedStyle(document.documentElement);
  for (const [g, v] of Object.entries(GROUP_VAR)) colors[g] = cs.getPropertyValue(v).trim() || "#888";
  colors.ink = cs.getPropertyValue("--ink").trim();
  colors.line = cs.getPropertyValue("--line-2").trim();
  colors.surface = cs.getPropertyValue("--chart-surface").trim();
  colors.muted = cs.getPropertyValue("--muted").trim();
  for (const n of nodes) {
    if (n.ty === "parti") n.color = cs.getPropertyValue(`--p-${n.id}`).trim() || colors.politique;
    else n.color = colors[n.g];
  }
}

function resize() {
  const r = canvas.getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  W = r.width;
  H = r.height;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  draw();
}

function toScreen(n) {
  return [n.x * transform.k + transform.x + W / 2, n.y * transform.k + transform.y + H / 2];
}
function toWorld(px, py) {
  return [(px - W / 2 - transform.x) / transform.k, (py - H / 2 - transform.y) / transform.k];
}

function draw() {
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const focus = selected || hover;
  const near = focus ? neighbors.get(focus.id) : null;
  const dim = (n) => (filterGroup && n.g !== filterGroup) || (near && n !== focus && !near.has(n.id));
  ctx.lineWidth = 1;
  for (const l of links) {
    const a = l.source, b = l.target;
    const hi = focus && (a === focus || b === focus);
    if (!hi && (dim(a) || dim(b)) && (focus || filterGroup)) ctx.globalAlpha = 0.06;
    else ctx.globalAlpha = hi ? 0.9 : 0.28;
    ctx.strokeStyle = hi ? focus.color : colors.line;
    const [x1, y1] = toScreen(a);
    const [x2, y2] = toScreen(b);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  for (const n of nodes) {
    const [x, y] = toScreen(n);
    if (x < -20 || y < -20 || x > W + 20 || y > H + 20) continue;
    ctx.globalAlpha = dim(n) ? 0.15 : 1;
    ctx.fillStyle = n.color;
    ctx.beginPath();
    if (n.ty === "dossier") ctx.rect(x - n.r, y - n.r, n.r * 2, n.r * 2);
    else ctx.arc(x, y, n.r * Math.min(1.6, Math.max(0.7, transform.k)), 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = colors.surface;
    ctx.stroke();
  }
  // Étiquettes : nœuds importants, voisins du focus, ou tout si zoom fort
  ctx.globalAlpha = 1;
  ctx.font = "600 12px Inter Variable, system-ui, sans-serif";
  ctx.textAlign = "center";
  for (const n of nodes) {
    const show = n === focus || (near && near.has(n.id)) || (!focus && !filterGroup && (n.d >= 9 || transform.k > 1.8)) || (filterGroup && n.g === filterGroup && (n.d >= 5 || transform.k > 1.4));
    if (!show) continue;
    const [x, y] = toScreen(n);
    if (x < 0 || y < 0 || x > W || y > H) continue;
    ctx.lineWidth = 3;
    ctx.strokeStyle = colors.surface;
    ctx.strokeText(n.t, x, y - n.r - 5);
    ctx.fillStyle = colors.ink;
    ctx.fillText(n.t, x, y - n.r - 5);
  }
}

function pickNode(px, py) {
  const [wx, wy] = toWorld(px, py);
  let best = null;
  let bd = Infinity;
  for (const n of nodes) {
    const d = (n.x - wx) ** 2 + (n.y - wy) ** 2;
    const rr = (n.r + 4) / transform.k;
    if (d < rr * rr && d < bd) {
      bd = d;
      best = n;
    }
  }
  return best;
}

function showInfo(n) {
  const info = root.querySelector("[data-info]");
  if (!n) {
    info.replaceChildren();
    return;
  }
  const p = previews[n.id] || {};
  const nb = [...(neighbors.get(n.id) || [])].map((id) => byId.get(id)).sort((a, b) => b.d - a.d).slice(0, 8);
  info.replaceChildren(
    el(
      "div",
      { class: "panel" },
      el("p", { class: "eyebrow" }, p.k || ""),
      el("h2", { class: "h4" }, el("a", { href: url(n.u) }, p.t || n.t)),
      el("p", { class: "small" }, p.s || ""),
      nb.length ? el("p", { class: "small muted" }, "Liée à : ", nb.map((m, i) => [i ? ", " : "", el("a", { href: "#", onclick: (e) => (e.preventDefault(), focusNode(m)) }, m.t)])) : "",
    ),
  );
}

function focusNode(n) {
  selected = n;
  transform.k = Math.max(transform.k, 1.6);
  transform.x = -n.x * transform.k;
  transform.y = -n.y * transform.k;
  showInfo(n);
  draw();
  history.replaceState(null, "", `${location.pathname}?n=${n.id}`);
}

function bindInteractions() {
  let drag = null;
  let pan = null;
  let moved = false;
  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const [px, py] = pos(e);
    const n = pickNode(px, py);
    moved = false;
    if (n) {
      drag = n;
      n.fx = n.x;
      n.fy = n.y;
      sim.alphaTarget(0.2).restart();
    } else pan = { px, py, x: transform.x, y: transform.y };
  });
  canvas.addEventListener("pointermove", (e) => {
    const [px, py] = pos(e);
    if (drag) {
      const [wx, wy] = toWorld(px, py);
      drag.fx = wx;
      drag.fy = wy;
      moved = true;
    } else if (pan) {
      transform.x = pan.x + (px - pan.px);
      transform.y = pan.y + (py - pan.py);
      moved = true;
      draw();
    } else {
      const n = pickNode(px, py);
      if (n !== hover) {
        hover = n;
        canvas.style.cursor = n ? "pointer" : "grab";
        draw();
      }
    }
  });
  const end = (e) => {
    const [px, py] = pos(e);
    if (drag) {
      drag.fx = null;
      drag.fy = null;
      sim.alphaTarget(0);
      if (!moved) focusNode(drag);
    } else if (pan && !moved) {
      const n = pickNode(px, py);
      selected = n;
      showInfo(n);
      draw();
    }
    drag = null;
    pan = null;
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const [px, py] = pos(e);
      const k0 = transform.k;
      const k1 = Math.max(0.2, Math.min(5, k0 * Math.exp(-e.deltaY * 0.0015)));
      // zoom centré sur le pointeur
      transform.x = px - W / 2 - ((px - W / 2 - transform.x) * k1) / k0;
      transform.y = py - H / 2 - ((py - H / 2 - transform.y) * k1) / k0;
      transform.k = k1;
      draw();
    },
    { passive: false },
  );
}

let sim;

async function init() {
  if (!root) return;
  canvas = root.querySelector("canvas");
  ctx = canvas.getContext("2d");
  let data;
  try {
    [data, previews] = await Promise.all([getJSON("/data/graphe.json"), getJSON("/data/apercus.json")]);
  } catch (e) {
    root.querySelector("[data-info]").textContent = "Impossible de charger le graphe.";
    return;
  }
  nodes = data.nodes.map((n) => ({ ...n, g: groupOf(n.th), r: 3 + Math.sqrt(n.d || 0) * 1.6 }));
  byId = new Map(nodes.map((n) => [n.id, n]));
  links = data.edges.map(([a, b]) => ({ source: a, target: b }));
  for (const n of nodes) neighbors.set(n.id, new Set());
  for (const [a, b] of data.edges) {
    neighbors.get(a)?.add(b);
    neighbors.get(b)?.add(a);
  }
  readColors();
  resize();
  window.addEventListener("resize", resize);
  new MutationObserver(() => (readColors(), draw())).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  sim = forceSimulation(nodes)
    .force("link", forceLink(links).id((d) => d.id).distance(38).strength(0.35))
    .force("charge", forceManyBody().strength(-55).distanceMax(380))
    .force("center", forceCenter(0, 0))
    .force("x", forceX(0).strength(0.03))
    .force("y", forceY(0).strength(0.03))
    .force("collide", forceCollide((d) => d.r + 2))
    .on("tick", draw);
  bindInteractions();

  // Légende et filtres
  const legend = root.querySelector("[data-legend]");
  const sel = root.querySelector("select[name=groupe]");
  for (const [g, label] of Object.entries(GROUP_LABEL)) {
    legend.append(el("span", {}, el("i", { style: { background: `var(${GROUP_VAR[g]})` } }), label));
    sel.append(el("option", { value: g }, label));
  }
  legend.append(el("span", {}, el("i", { style: { background: "var(--muted)", borderRadius: "2px" } }), "Dossier (carré)"));
  sel.addEventListener("change", () => ((filterGroup = sel.value), draw()));
  const input = root.querySelector("input[name=q]");
  const list = root.querySelector("datalist");
  for (const n of [...nodes].sort((a, b) => a.t.localeCompare(b.t, "fr"))) list.append(el("option", { value: n.t }));
  input.addEventListener("change", () => {
    const q = input.value.trim().toLowerCase();
    const n = nodes.find((m) => m.t.toLowerCase() === q) || nodes.find((m) => m.t.toLowerCase().includes(q));
    if (n) focusNode(n);
  });
  root.querySelector("[data-reset]").addEventListener("click", () => {
    transform = { x: 0, y: 0, k: 1 };
    selected = null;
    showInfo(null);
    draw();
  });
  root.querySelector("[data-stats]").textContent = `${nodes.length} nœuds, ${links.length} liens`;
  const start = params().get("n");
  if (start && byId.has(start)) setTimeout(() => focusNode(byId.get(start)), 1200);
  update((s) => {
    s.games.graphe = (s.games.graphe || 0) + 1;
  });
}

init();
