// Thésaurus SKOS du lexique (Turtle et JSON-LD) : un concept par notion, regroupé sous les thèmes.
export const data = {
  pagination: { data: "thesaurusFormats", size: 1, alias: "fmt" },
  thesaurusFormats: ["ttl", "jsonld"],
  permalink: (d) => `/thesaurus.${d.fmt}`,
  eleventyExcludeFromCollections: true,
};

const splitTerm = (t) => String(t || "").split(/\s+\/\s+/).map((s) => s.trim()).filter(Boolean);

function build({ rawCorpus, site, taxonomy }) {
  const abs = (u) => site.url.replace(/\/$/, "") + site.pathPrefix.replace(/\/$/, "") + u;
  const scheme = abs("/thesaurus#scheme");
  const notions = rawCorpus.ofType("notion");
  const themeId = (t) => abs(`/themes/${t}/#theme`);
  const concepts = notions.map((n) => {
    const labels = { fr: [n.title], nl: splitTerm(n.terms?.nl), de: splitTerm(n.terms?.de), en: splitTerm(n.terms?.en) };
    return {
      id: abs(`${n.url}#entite`),
      page: abs(n.url),
      pref: Object.fromEntries(Object.entries(labels).filter(([, v]) => v.length).map(([k, v]) => [k, v[0]])),
      alt: [
        ...(n.aliases || []).map((a) => ["fr", a]),
        ...Object.entries(labels).flatMap(([k, v]) => v.slice(1).map((x) => [k, x])),
      ],
      def: n.summary,
      broader: (n.themes || []).map(themeId),
      related: (n.relatedValid || []).filter((s) => rawCorpus.get(s)?.type === "notion").map((s) => abs(`${rawCorpus.get(s).url}#entite`)),
      wikidata: n.data.wikidata ? `http://www.wikidata.org/entity/${n.data.wikidata}` : null,
      notation: n.slug,
    };
  });
  const themes = taxonomy.THEMES.map((t) => ({
    id: themeId(t.slug),
    page: abs(`/themes/${t.slug}/`),
    label: t.label,
    def: t.intro || "",
    narrower: concepts.filter((c) => c.broader.includes(themeId(t.slug))).map((c) => c.id),
  }));
  return { scheme, concepts, themes, site, abs };
}

const lit = (s) => `"${String(s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, " ")}"`;

function turtle({ scheme, concepts, themes, site, abs }) {
  const out = [
    "@prefix skos: <http://www.w3.org/2004/02/skos/core#> .",
    "@prefix dct: <http://purl.org/dc/terms/> .",
    "@prefix foaf: <http://xmlns.com/foaf/0.1/> .",
    "@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .",
    "",
    `<${scheme}> a skos:ConceptScheme ;`,
    `  dct:title ${lit("Sociopo — Thésaurus de la sociopolitique belge")}@fr ;`,
    `  dct:description ${lit(site.description)}@fr ;`,
    `  dct:publisher ${lit(site.editor)} ;`,
    `  dct:license <${site.license.url}> ;`,
    `  dct:modified ${lit(site.updated)}^^xsd:date ;`,
    `  foaf:homepage <${abs("/lexique/")}> ;`,
    `  skos:hasTopConcept ${themes.map((t) => `<${t.id}>`).join(", ")} .`,
    "",
  ];
  for (const t of themes) {
    out.push(`<${t.id}> a skos:Concept ;`, `  skos:inScheme <${scheme}> ;`, `  skos:topConceptOf <${scheme}> ;`, `  skos:prefLabel ${lit(t.label)}@fr ;`);
    if (t.def) out.push(`  skos:scopeNote ${lit(t.def)}@fr ;`);
    if (t.narrower.length) out.push(`  skos:narrower ${t.narrower.map((n) => `<${n}>`).join(", ")} ;`);
    out.push(`  foaf:page <${t.page}> .`, "");
  }
  for (const c of concepts) {
    out.push(`<${c.id}> a skos:Concept ;`, `  skos:inScheme <${scheme}> ;`, `  skos:notation ${lit(c.notation)} ;`);
    out.push(`  skos:prefLabel ${Object.entries(c.pref).map(([l, v]) => `${lit(v)}@${l}`).join(", ")} ;`);
    if (c.alt.length) out.push(`  skos:altLabel ${c.alt.map(([l, v]) => `${lit(v)}@${l}`).join(", ")} ;`);
    if (c.def) out.push(`  skos:definition ${lit(c.def)}@fr ;`);
    if (c.broader.length) out.push(`  skos:broader ${c.broader.map((b) => `<${b}>`).join(", ")} ;`);
    if (c.related.length) out.push(`  skos:related ${c.related.map((b) => `<${b}>`).join(", ")} ;`);
    if (c.wikidata) out.push(`  skos:exactMatch <${c.wikidata}> ;`);
    out.push(`  foaf:page <${c.page}> .`, "");
  }
  return out.join("\n");
}

function jsonld({ scheme, concepts, themes, site, abs }) {
  const L = (v, l) => ({ "@value": v, "@language": l });
  return JSON.stringify({
    "@context": { skos: "http://www.w3.org/2004/02/skos/core#", dct: "http://purl.org/dc/terms/", foaf: "http://xmlns.com/foaf/0.1/" },
    "@graph": [
      { "@id": scheme, "@type": "skos:ConceptScheme", "dct:title": L("Sociopo — Thésaurus de la sociopolitique belge", "fr"), "dct:license": { "@id": site.license.url }, "dct:modified": site.updated, "skos:hasTopConcept": themes.map((t) => ({ "@id": t.id })) },
      ...themes.map((t) => ({ "@id": t.id, "@type": "skos:Concept", "skos:inScheme": { "@id": scheme }, "skos:topConceptOf": { "@id": scheme }, "skos:prefLabel": L(t.label, "fr"), "skos:narrower": t.narrower.map((n) => ({ "@id": n })), "foaf:page": { "@id": t.page } })),
      ...concepts.map((c) => ({
        "@id": c.id,
        "@type": "skos:Concept",
        "skos:inScheme": { "@id": scheme },
        "skos:notation": c.notation,
        "skos:prefLabel": Object.entries(c.pref).map(([l, v]) => L(v, l)),
        ...(c.alt.length ? { "skos:altLabel": c.alt.map(([l, v]) => L(v, l)) } : {}),
        "skos:definition": L(c.def, "fr"),
        "skos:broader": c.broader.map((b) => ({ "@id": b })),
        ...(c.related.length ? { "skos:related": c.related.map((b) => ({ "@id": b })) } : {}),
        ...(c.wikidata ? { "skos:exactMatch": { "@id": c.wikidata } } : {}),
        "foaf:page": { "@id": c.page },
      })),
    ],
  });
}

export function render(d) {
  const model = build(d);
  return d.fmt === "ttl" ? turtle(model) : jsonld(model);
}
