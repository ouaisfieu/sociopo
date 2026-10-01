import { computedFor } from "../../../lib/pagedata.js";
export default {
  layout: "layouts/dossier.njk",
  tags: ["dossier"],
  eleventyComputed: computedFor("dossier", "/dossiers/"),
};
