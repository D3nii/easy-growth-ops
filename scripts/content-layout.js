// Renders content pages (guides, integration how-tos, comparisons) with layouts/content.html.
//
// A content page's HTML file holds only the article body inside <body>. Everything else
// comes from here and from the page's entry in site.config.js (PAGES):
//   - <head>: title, description, canonical, og/twitter tags (absolute, via __SITE_URL__)
//   - shared nav and footer, breadcrumbs (visible + BreadcrumbList JSON-LD)
//   - <!--@byline--> -> author byline + "Updated <date>" (git date of the page file)
//   - <!--@guides--> -> card list of every page with a `guide` entry (for /guides/)
//   - JSON-LD graph: Organization, Person (Danyal), WebPage/CollectionPage, BreadcrumbList,
//     TechArticle/Article, plus FAQPage from [data-faq] blocks, HowTo from ol[data-howto],
//     SoftwareApplication (ROI) when `software: true`, ItemList on the hub.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "node-html-parser";
import { PAGES, SITE_URL } from "../site.config.js";

const esc = (value) =>
  String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const clean = (text) => text.replace(/\s+/g, " ").trim();
const abs = (path) => `${SITE_URL}${path}`;

function breadcrumbTrail(page) {
  const trail = [{ name: "Home", path: "/" }];
  if (page.path !== "/guides/") trail.push({ name: "Guides", path: "/guides/" });
  trail.push({ name: page.breadcrumb, path: page.path });
  return trail;
}

function breadcrumbsHtml(trail) {
  const items = trail
    .map((crumb, i) =>
      i === trail.length - 1
        ? `<li><span aria-current="page">${esc(crumb.name)}</span></li>`
        : `<li><a href="${crumb.path}">${esc(crumb.name)}</a></li>`,
    )
    .join("");
  return `      <nav class="breadcrumbs" aria-label="Breadcrumb"><ol>${items}</ol></nav>`;
}

function guidesHtml() {
  const guides = PAGES.filter((page) => page.guide);
  const cards = guides
    .map(
      (page) => `          <li>
            <a class="guide-card" href="${page.path}" data-cta="guides_card_${page.name}" data-cta-type="product" data-product="roi">
              <span class="guide-section">${esc(page.guide.section)}</span>
              <span class="guide-title">${esc(page.h1)}</span>
              <span class="guide-summary">${esc(page.guide.summary)}</span>
            </a>
          </li>`,
    )
    .join("\n");
  return `<ul class="guide-list">\n${cards}\n        </ul>`;
}

function bylineHtml() {
  return `<p class="byline">By <a href="/roi/#use" rel="author">Danyal Jamil</a>, media buyer</p>
        <p class="updated">Updated <time datetime="__UPDATED_ISO__">__UPDATED_HUMAN__</time></p>`;
}

function faqNodes(root) {
  const items = root.querySelectorAll("[data-faq] .faq-item");
  return items.map((item) => {
    const question = item.querySelector("h3");
    const answer = item.querySelector(".faq-a") || item;
    return {
      "@type": "Question",
      name: clean(question.text),
      acceptedAnswer: { "@type": "Answer", text: clean(answer.text) },
    };
  });
}

function howToNode(root, page) {
  const list = root.querySelector("ol[data-howto]");
  if (!list) return null;
  const steps = list.childNodes.filter((node) => node.tagName === "LI").map((li, i) => {
    const name = li.querySelector("strong");
    return {
      "@type": "HowToStep",
      position: i + 1,
      name: clean(name ? name.text : li.text).replace(/[.:]$/, ""),
      text: clean(li.text),
      url: `${abs(page.path)}#${list.getAttribute("id") || "howto"}`,
    };
  });
  return {
    "@type": "HowTo",
    "@id": `${abs(page.path)}#howto`,
    name: list.getAttribute("data-howto"),
    step: steps,
  };
}

function jsonLd(page, root, trail) {
  const url = abs(page.path);
  const graph = [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#org`,
      name: "Easy Growth Ops",
      url: SITE_URL,
      parentOrganization: { "@type": "Organization", name: "Jamil Global", url: "https://jamilglobal.com" },
    },
    {
      "@type": "Person",
      "@id": `${SITE_URL}/#danyal`,
      name: "Danyal Jamil",
      jobTitle: "Media buyer",
      worksFor: { "@id": `${SITE_URL}/#org` },
      sameAs: ["https://www.linkedin.com/in/d3nyal/"],
    },
    {
      "@type": page.schema === "CollectionPage" ? "CollectionPage" : "WebPage",
      "@id": `${url}#page`,
      url,
      name: page.title,
      description: page.description,
      dateModified: "__UPDATED_ISO__",
      isPartOf: { "@id": `${SITE_URL}/#org` },
      breadcrumb: { "@id": `${url}#breadcrumb` },
      ...(page.schema === "CollectionPage" ? { mainEntity: { "@id": `${url}#guides` } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${url}#breadcrumb`,
      itemListElement: trail.map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: abs(crumb.path),
      })),
    },
  ];

  if (page.schema === "TechArticle" || page.schema === "Article") {
    graph.push({
      "@type": page.schema,
      "@id": `${url}#article`,
      headline: page.h1,
      description: page.description,
      url,
      image: `${SITE_URL}/og/${page.ogImage}.png`,
      author: { "@id": `${SITE_URL}/#danyal` },
      publisher: { "@id": `${SITE_URL}/#org` },
      datePublished: page.published,
      dateModified: "__UPDATED_ISO__",
      mainEntityOfPage: { "@id": `${url}#page` },
      inLanguage: "en",
    });
  }

  if (page.schema === "CollectionPage") {
    graph.push({
      "@type": "ItemList",
      "@id": `${url}#guides`,
      itemListElement: PAGES.filter((p) => p.guide).map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: abs(p.path),
        name: p.h1,
      })),
    });
  }

  const faq = faqNodes(root);
  if (faq.length) graph.push({ "@type": "FAQPage", "@id": `${url}#faq`, mainEntity: faq });

  const howTo = howToNode(root, page);
  if (howTo) graph.push(howTo);

  if (page.software) {
    graph.push({
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/roi/#app`,
      name: "Easy Growth Ops ROI",
      url: `${SITE_URL}/roi/`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Slack",
      creator: { "@id": `${SITE_URL}/#org` },
      description:
        "Slack P&L for pay-per-call media buyers. Reads Meta Ads, Google Ads, and TikTok Ads spend plus call payout from Ringba, CallGrid, TrackDrive, Retreaver, or Phonexa, then posts net profit every 15–30 minutes, depending on setup.",
      offers: {
        "@type": "Offer",
        priceCurrency: "USD",
        price: "100",
        priceSpecification: { "@type": "UnitPriceSpecification", price: "100", priceCurrency: "USD", unitText: "MONTH" },
        description: "Founding price: $200 the first month including setup, then $100 a month. $150 a month after the first 50 shops.",
      },
    });
  }

  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }, null, 2)
    .replaceAll("<", "\\u003c")
    .split("\n")
    .map((line) => `      ${line}`)
    .join("\n");
}

/** Returns the full HTML document for a content page, or throws with a clear message. */
export function renderContentPage(root, page, sourceHtml) {
  for (const key of ["title", "h1", "description", "breadcrumb", "ogImage", "ogImageAlt", "schema"]) {
    if (!page[key]) throw new Error(`[content-layout] ${page.file}: missing "${key}" in site.config.js`);
  }
  const doc = parse(sourceHtml, { comment: true });
  const body = doc.querySelector("body");
  if (!body) throw new Error(`[content-layout] ${page.file}: no <body>`);
  let content = body.innerHTML;
  if (!content.includes("<!--@byline-->")) throw new Error(`[content-layout] ${page.file}: missing <!--@byline-->`);
  content = content.replace("<!--@byline-->", bylineHtml()).replace("<!--@guides-->", guidesHtml());

  const trail = breadcrumbTrail(page);
  const rendered = parse(content);
  const layout = readFileSync(resolve(root, "layouts/content.html"), "utf8");
  const slots = {
    title: esc(page.title),
    description: esc(page.description),
    path: page.path,
    og_type: page.schema === "CollectionPage" ? "website" : "article",
    og_image: page.ogImage,
    og_image_alt: esc(page.ogImageAlt),
    name: page.name,
    jsonld: jsonLd(page, rendered, trail),
    breadcrumbs: breadcrumbsHtml(trail),
    content,
  };
  return layout.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    if (!(key in slots)) throw new Error(`[content-layout] unknown slot ${match}`);
    return slots[key];
  });
}
