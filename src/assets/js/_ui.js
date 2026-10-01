// Petits utilitaires d'interface partagés entre modules.

export const base = (document.body && document.body.dataset.base) || "/";

export function url(p = "") {
  return base.replace(/\/$/, "") + (p.startsWith("/") ? p : `/${p}`);
}

let toastTimer = null;
export function toast(message, ms = 3200) {
  const el = document.getElementById("toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

const cache = new Map();
export async function getJSON(path) {
  const u = url(path);
  if (cache.has(u)) return cache.get(u);
  const p = fetch(u, { credentials: "same-origin" }).then((r) => {
    if (!r.ok) throw new Error(`HTTP ${r.status} sur ${u}`);
    return r.json();
  });
  cache.set(u, p);
  try {
    return await p;
  } catch (e) {
    cache.delete(u);
    throw e;
  }
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else if (k === "dataset") Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) {
    if (c === undefined || c === null || c === false) continue;
    node.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return node;
}

export function svgEl(tag, attrs = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) node.setAttribute(k, String(v));
  return node;
}

export function shuffle(arr, rnd = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Générateur pseudo-aléatoire déterministe (mulberry32). */
export function seeded(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function fmt(n, d = 0) {
  return Number(n).toLocaleString("fr-BE", { minimumFractionDigits: d, maximumFractionDigits: d });
}

export function params() {
  return new URLSearchParams(location.search);
}
