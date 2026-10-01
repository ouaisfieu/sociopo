// Évolution des familles politiques à la Chambre (part des sièges, barres empilées à 100 %).
import { svgEl, el, url } from "./_ui.js";
import { tooltip } from "./_chart.js";

const FAM = [
  ["gauche-radicale", "Gauche radicale", "ptb-pvda"],
  ["socialiste", "Socialistes", "ps"],
  ["ecologiste", "Écologistes", "ecolo"],
  ["regionaliste", "FDF, RW, DéFI", "defi"],
  ["chretienne-democrate", "Chrétiens-démocrates", "cd-v"],
  ["liberale", "Libéraux", "mr"],
  ["nationaliste-flamande", "Nationalistes flamands", "n-va"],
  ["extreme-droite", "Extrême droite", "vlaams-belang"],
  ["autre", "Autres", "autre"],
];

const host = document.querySelector("[data-evolution]");
const data = document.getElementById("evo-data");
const fams = document.getElementById("evo-parties");
if (host && data && fams) {
  const elections = JSON.parse(data.textContent).filter((e) => Array.isArray(e.seats));
  const famOf = JSON.parse(fams.textContent);
  const famKey = (slug) => {
    const f = slug ? famOf[slug] : "autre";
    if (!f || f === "populiste" || f === "regionaliste_de") return "autre";
    return f;
  };
  // Légende (≥ 2 séries : toujours présente)
  const legend = el("ul", { class: "legend" });
  for (const [, label, p] of FAM) legend.append(el("li", {}, el("span", { class: "sw", style: { background: `var(--p-${p})` } }), label));
  host.append(legend);

  const W = 1200;
  const H = 360;
  const m = { l: 44, r: 10, t: 10, b: 34 };
  const band = (W - m.l - m.r) / elections.length;
  const bw = Math.min(24, band * 0.6);
  const svg = svgEl("svg", { viewBox: `0 0 ${W} ${H}`, width: "100%", role: "group", "aria-label": "Part des sièges par famille politique à chaque élection législative" });
  const y = (v) => m.t + (1 - v) * (H - m.t - m.b);
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    svg.append(svgEl("line", { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), stroke: "var(--chart-grid)", "stroke-width": 1 }));
    const lab = svgEl("text", { x: m.l - 6, y: y(t) + 4, "text-anchor": "end", "font-size": 11, fill: "var(--chart-muted)" });
    lab.textContent = `${Math.round(t * 100)} %`;
    svg.append(lab);
  }
  const tip = tooltip();
  elections.forEach((e, i) => {
    const total = e.total || e.seats.reduce((a, s) => a + s.seats, 0);
    const shares = Object.fromEntries(FAM.map(([k]) => [k, 0]));
    for (const s of e.seats) shares[famKey(s.party)] += s.seats;
    const cx = m.l + band * i + band / 2;
    const g = svgEl("g", { tabindex: 0, role: "link", "aria-label": `${e.name} : ${FAM.filter(([k]) => shares[k]).map(([k, l]) => `${l} ${shares[k]} sièges`).join(", ")}` });
    let acc = 0;
    FAM.forEach(([k, , p], j) => {
      const v = shares[k] / total;
      if (!v) return;
      const y1 = y(acc + v);
      const y0 = y(acc);
      const h = Math.max(0, y0 - y1 - 2); // 2 px d'écart de surface
      g.append(svgEl("rect", { x: cx - bw / 2, y: y1 + (j === 0 ? 0 : 0), width: bw, height: h, style: `fill:var(--p-${p})`, rx: 1.5 }));
      acc += v;
    });
    // zone de survol plus large que la barre
    g.append(svgEl("rect", { x: cx - band / 2, y: m.t, width: band, height: H - m.t - m.b, fill: "transparent" }));
    const lab = svgEl("text", { x: cx, y: H - 12, "text-anchor": "middle", "font-size": 11, fill: "var(--chart-muted)" });
    lab.textContent = e.date.slice(0, 4);
    g.append(lab);
    const rows = [[e.name, `${total} sièges`], ...FAM.filter(([k]) => shares[k]).map(([k, l]) => [`${shares[k]}`, `${l} (${((shares[k] / total) * 100).toFixed(1).replace(".", ",")} %)`])];
    g.addEventListener("pointermove", (ev) => tip.show(g, rows, ev));
    g.addEventListener("focus", () => tip.show(g, rows));
    g.addEventListener("pointerleave", () => tip.hide());
    g.addEventListener("blur", () => tip.hide());
    g.addEventListener("click", () => (location.href = url(`/elections/${e.id}/`)));
    g.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") location.href = url(`/elections/${e.id}/`);
    });
    g.style.cursor = "pointer";
    svg.append(g);
  });
  host.append(svg);
  host.append(el("p", { class: "small muted", style: { margin: ".4rem .6rem" } }, "Familles reconstituées à partir des partis (avant 1968, les partis unitaires sont classés dans leur famille). Les valeurs exactes figurent dans les pages de chaque scrutin."));
}
