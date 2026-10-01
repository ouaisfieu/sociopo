// Publie chaque jeu de données ouvert sous /data/<nom>.json
import { DATASETS, buildDataset } from "../../../lib/opendata.js";

export const data = {
  pagination: { data: "datasetNames", size: 1, alias: "dsName" },
  datasetNames: DATASETS.map((d) => d.name),
  permalink: (d) => `/data/${d.dsName}.json`,
  eleventyExcludeFromCollections: true,
};

export function render(d) {
  const out = buildDataset(d.dsName, {
    corpus: d.rawCorpus,
    site: d.site,
    elections: d.elections,
    gouvernements: d.gouvernements,
    chronologie: d.chronologie,
    quiz: d.quiz || { items: [] },
    competences: d.competences || { items: [] },
  });
  return JSON.stringify(out);
}
