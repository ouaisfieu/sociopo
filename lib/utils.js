// Utilitaires partagés (build) — Sociopo
// Aucune dépendance externe : dates, slugs, échappements.

const MOIS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

/** Transforme un texte en slug ASCII minuscule (« Réforme de l'État » → « reforme-de-l-etat »). */
export function slugify(input = "") {
  return String(input)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Clé de tri alphabétique insensible aux accents et à la casse. */
export function sortKey(input = "") {
  return String(input)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^(l'|le |la |les |l’)/i, "")
    .toLowerCase();
}

export function compareFr(a, b) {
  return sortKey(a).localeCompare(sortKey(b), "fr", { sensitivity: "base", numeric: true });
}

/** Première lettre (A–Z ou #) pour l'abécédaire. */
export function initialLetter(title = "") {
  const c = sortKey(title).charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

/**
 * Formate une date partielle ISO (« 1993 », « 1993-05 », « 1993-05-08 ») en français.
 * Retourne une chaîne vide si l'entrée est absente.
 */
export function dateFr(value, { short = false } = {}) {
  if (value === undefined || value === null || value === "") return "";
  const s = value instanceof Date ? value.toISOString().slice(0, 10) : String(value).trim();
  const m = s.match(/^(-?\d{1,4})(?:-(\d{2}))?(?:-(\d{2}))?$/);
  if (!m) return s;
  const [, y, mo, d] = m;
  if (!mo) return y;
  const mois = MOIS[Number(mo) - 1] || "";
  const moisAff = short ? mois.slice(0, 4).replace(/\.$/, "") + (mois.length > 4 ? "." : "") : mois;
  if (!d) return `${moisAff} ${y}`;
  const jour = Number(d) === 1 ? "1er" : String(Number(d));
  return `${jour} ${moisAff} ${y}`;
}

/** Année d'une date partielle. */
export function yearOf(value) {
  if (!value) return null;
  if (value instanceof Date) return value.getUTCFullYear();
  const m = String(value).match(/^(-?\d{1,4})/);
  return m ? Number(m[1]) : null;
}

/** Nombre de jours entre deux dates ISO complètes (b exclue). */
export function daysBetween(a, b) {
  const da = new Date(`${a}T00:00:00Z`);
  const db = new Date(`${b}T00:00:00Z`);
  return Math.round((db - da) / 86400000);
}

/** Échappement HTML minimal. */
export function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Supprime le balisage Markdown/wiki-liens pour obtenir du texte brut. */
export function plainText(md = "") {
  return String(md)
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, (_, s) => s.replace(/-/g, " "))
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/[*_`>]/g, "")
    .replace(/:::[a-z-]*\s*/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Tronque proprement à n caractères sur une limite de mot. */
export function truncate(s = "", n = 160) {
  const t = String(s).trim();
  if (t.length <= n) return t;
  const cut = t.slice(0, n - 1);
  const sp = cut.lastIndexOf(" ");
  return `${cut.slice(0, sp > n * 0.6 ? sp : cut.length).replace(/[,;:.\s]+$/, "")}…`;
}

/** Compte de mots approximatif (pour le temps de lecture). */
export function wordCount(s = "") {
  return plainText(s).split(/\s+/).filter(Boolean).length;
}

export function readingTime(s = "") {
  return Math.max(1, Math.round(wordCount(s) / 220));
}

/** Nombre au format belge francophone (espace fine insécable comme séparateur de milliers). */
export function numFr(n, digits) {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  if (Number.isNaN(v)) return String(n);
  return v.toLocaleString("fr-BE", digits === undefined ? {} : { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** Hash déterministe (pour « la notion du jour », etc.). */
export function hashString(s = "") {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function unique(arr = []) {
  return [...new Set(arr.filter((x) => x !== undefined && x !== null && x !== ""))];
}

export function groupBy(arr, fn) {
  const out = new Map();
  for (const item of arr) {
    const k = fn(item);
    if (!out.has(k)) out.set(k, []);
    out.get(k).push(item);
  }
  return out;
}
