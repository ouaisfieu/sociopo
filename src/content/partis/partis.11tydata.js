import { computedFor } from "../../../lib/pagedata.js";
export default {
  layout: "layouts/parti.njk",
  tags: ["parti"],
  eleventyComputed: computedFor("parti", "/partis/"),
};
