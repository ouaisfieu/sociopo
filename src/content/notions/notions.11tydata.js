import { computedFor } from "../../../lib/pagedata.js";
export default {
  layout: "layouts/notice.njk",
  tags: ["notion"],
  eleventyComputed: computedFor("notion", "/notions/"),
};
