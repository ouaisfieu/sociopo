import { computedFor } from "../../../lib/pagedata.js";
export default {
  layout: "layouts/personne.njk",
  tags: ["personne"],
  eleventyComputed: computedFor("personne", "/personnalites/"),
};
