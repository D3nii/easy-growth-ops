// Shared JSON-LD nodes: one Organization and one WebSite for the whole site.
// - content pages: scripts/content-layout.js puts these objects into its @graph
// - hand-written pages: a "__SCHEMA_SITE_NODES__," placeholder at the top of their @graph is
//   replaced with the serialized nodes by renderPage() in scripts/vite-site-plugin.js
// Person, WebPage, and the rest stay on each page.
import { CONTACT_EMAIL, SITE_URL } from "../site.config.js";

export const SCHEMA_SITE_NODES_TOKEN = "__SCHEMA_SITE_NODES__";

export function organizationNode() {
  return {
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "Easy Growth Ops",
    url: SITE_URL,
    email: CONTACT_EMAIL,
    description:
      "Two tools for performance marketers: Slack P&L from call payout plus Meta, Google, and TikTok ad spend, and daily winning ads in Slack.",
    logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.svg` },
    parentOrganization: { "@type": "Organization", name: "Jamil Global", url: "https://jamilglobal.com" },
    founder: { "@id": `${SITE_URL}/#danyal` },
    sameAs: ["https://jamilglobal.com", "https://www.linkedin.com/company/jamil-global/"],
  };
}

export function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Easy Growth Ops",
    url: `${SITE_URL}/`,
    inLanguage: "en",
    publisher: { "@id": `${SITE_URL}/#org` },
  };
}

/** The Organization and WebSite nodes as one-line JSON, comma-separated, for an @graph array. */
export function siteNodesJson() {
  return [organizationNode(), websiteNode()].map((node) => JSON.stringify(node).replaceAll("<", "\\u003c")).join(",\n");
}
