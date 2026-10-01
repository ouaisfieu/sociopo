// Calcul de la disposition d'un hémicycle (diagramme parlementaire).
// Module sans dépendance, partagé entre le build (SVG statique) et le navigateur (simulateurs).

/**
 * Positions des sièges pour un hémicycle de `n` sièges.
 * Retourne un tableau trié de gauche à droite : { x, y, r, angle, row }.
 * Coordonnées : rayon extérieur 1, centre (0,0), y négatif vers le haut.
 */
export function seatPositions(n, { inner = 0.38 } = {}) {
  if (!n || n < 1) return [];
  let rows = 1;
  const capacity = (R) => {
    const d = (1 - inner) / R;
    let cap = 0;
    for (let i = 0; i < R; i++) cap += Math.floor((Math.PI * (inner + d * (i + 0.5))) / d);
    return cap;
  };
  while (capacity(rows) < n && rows < 40) rows++;
  const d = (1 - inner) / rows;
  const radii = Array.from({ length: rows }, (_, i) => inner + d * (i + 0.5));
  const totalR = radii.reduce((a, b) => a + b, 0);
  // Répartition proportionnelle au rayon (plus forts restes)
  const raw = radii.map((r) => (n * r) / totalR);
  const counts = raw.map(Math.floor);
  let rest = n - counts.reduce((a, b) => a + b, 0);
  const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; rest > 0; k = (k + 1) % rows, rest--) counts[order[k][1]]++;
  const seats = [];
  radii.forEach((r, row) => {
    const c = counts[row];
    for (let k = 0; k < c; k++) {
      const angle = c === 1 ? Math.PI / 2 : Math.PI * (1 - k / (c - 1));
      seats.push({ x: r * Math.cos(angle), y: -r * Math.sin(angle), r: d * 0.36, angle, row });
    }
  });
  seats.sort((a, b) => b.angle - a.angle || a.row - b.row);
  return seats;
}

/** Attribue les sièges aux partis (dans l'ordre fourni, gauche → droite). */
export function assignSeats(parties, positions) {
  const out = [];
  let i = 0;
  for (const p of parties) {
    for (let s = 0; s < p.seats && i < positions.length; s++, i++) out.push({ ...positions[i], party: p });
  }
  return out;
}

/** Génère un SVG d'hémicycle (chaîne) — utilisé au build pour un rendu sans JavaScript. */
export function hemicycleSvg(parties, total, { title = "Hémicycle", majority = null, idPrefix = "h" } = {}) {
  const n = total || parties.reduce((a, p) => a + p.seats, 0);
  const pos = seatPositions(n);
  const seats = assignSeats(parties, pos);
  const maj = majority || Math.floor(n / 2) + 1;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const circles = seats
    .map(
      (s) =>
        `<circle class="seat" cx="${s.x.toFixed(4)}" cy="${s.y.toFixed(4)}" r="${s.r.toFixed(4)}" style="fill:${esc(s.party.color || "#9a9890")}" data-party="${esc(s.party.slug || s.party.label)}"><title>${esc(s.party.label)} — ${s.party.seats} siège${s.party.seats > 1 ? "s" : ""}</title></circle>`,
    )
    .join("");
  const desc = parties.map((p) => `${p.label} ${p.seats}`).join(", ");
  return `<svg class="hemicycle" viewBox="-1.06 -1.08 2.12 1.2" role="img" aria-labelledby="${idPrefix}-t ${idPrefix}-d" xmlns="http://www.w3.org/2000/svg"><title id="${idPrefix}-t">${esc(title)}</title><desc id="${idPrefix}-d">${esc(`${n} sièges, majorité absolue à ${maj}. ${desc}.`)}</desc>${circles}<line class="majority-line" x1="0" y1="-1.04" x2="0" y2="-0.3" stroke-dasharray="0"/><text x="0" y="-0.06" text-anchor="middle" font-size="0.16" font-weight="700">${n}</text><text x="0" y="0.07" text-anchor="middle" font-size="0.065" fill="currentColor" opacity="0.7">majorité : ${maj}</text></svg>`;
}
