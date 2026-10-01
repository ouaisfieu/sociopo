export const data = { permalink: "/opensearch.xml", eleventyExcludeFromCollections: true };
export function render({ site }) {
  const root = site.url.replace(/\/$/, "") + site.pathPrefix;
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>Sociopo</ShortName>
  <Description>Rechercher dans l'encyclopédie de la sociopolitique belge</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <Language>fr-BE</Language>
  <Image width="32" height="32" type="image/png">${root}assets/img/favicon-32.png</Image>
  <Url type="text/html" method="get" template="${root}recherche/?q={searchTerms}"/>
  <moz:SearchForm xmlns:moz="http://www.mozilla.org/2006/browser/search/">${root}recherche/</moz:SearchForm>
</OpenSearchDescription>
`;
}
