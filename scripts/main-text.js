// Plain-text conversion of a page's <main> for llms-full.txt (see llmsFullTxt() in scripts/vite-site-plugin.js).
// Output is markdown-like: headings as #/##/###, paragraphs separated by blank lines, list items as "- ",
// table rows as cells joined with " | ". Links keep their text; absolute and internal hrefs add the
// absolute URL in parentheses. Script, style, svg, video, noscript, and aria-hidden="true" subtrees are
// dropped. node-html-parser decodes entities in .text, and whitespace is collapsed.
import { NodeType } from "node-html-parser";
import { SITE_URL } from "../site.config.js";

const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "SVG", "VIDEO", "NOSCRIPT"]);
const BLOCK_TAGS = new Set([
  "ADDRESS", "ARTICLE", "ASIDE", "BLOCKQUOTE", "DD", "DETAILS", "DIALOG", "DIV", "DL", "DT", "FIELDSET",
  "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN",
  "NAV", "OL", "P", "PRE", "SECTION", "SUMMARY", "TABLE", "UL",
]);

const clean = (text) => text.replace(/\s+/g, " ").trim();
const isSkipped = (node) => SKIPPED_TAGS.has(node.tagName) || node.getAttribute("aria-hidden") === "true";

function linkText(a, text) {
  const href = a.getAttribute("href") || "";
  const url = /^\/(?!\/)/.test(href) ? `${SITE_URL}${href}` : /^https?:\/\//.test(href) ? href : "";
  if (!url || !clean(text)) return text;
  return clean(text) === url ? text : `${text} (${url})`;
}

/** Inline text of a node. Block children and <br> become spaces so adjacent words don't merge. */
function inlineText(node) {
  if (node.nodeType === NodeType.TEXT_NODE) return node.text;
  if (node.nodeType !== NodeType.ELEMENT_NODE || isSkipped(node)) return "";
  if (node.tagName === "BR") return " ";
  const text = node.childNodes.map(inlineText).join("");
  if (node.tagName === "A") return linkText(node, text);
  return BLOCK_TAGS.has(node.tagName) ? ` ${text} ` : text;
}

function tableRow(tr) {
  const cells = tr.childNodes
    .filter((cell) => (cell.tagName === "TH" || cell.tagName === "TD") && !isSkipped(cell))
    .map((cell) => clean(inlineText(cell)));
  return cells.length ? cells.join(" | ") : "";
}

/** Rows of a table in document order, including rows inside thead, tbody, and tfoot. */
function tableRows(node) {
  return node.childNodes.flatMap((child) => {
    if (child.nodeType !== NodeType.ELEMENT_NODE || isSkipped(child)) return [];
    if (child.tagName === "TR") return [tableRow(child)];
    return tableRows(child);
  });
}

/** One list item. Nested blocks (paragraphs, nested lists) go under it, indented two spaces. */
function listItem(li) {
  if (isSkipped(li)) return "";
  const [first, ...rest] = blocksOf(li);
  if (!first) return "";
  const nested = rest.map((block) => block.split("\n").map((line) => `  ${line}`).join("\n"));
  return [`- ${first}`, ...nested].join("\n");
}

/** One block-level element as zero or more blocks. */
function blockFor(el) {
  const tag = el.tagName;
  if (/^H[1-6]$/.test(tag)) {
    const text = clean(inlineText(el));
    return text ? [`${"#".repeat(Number(tag[1]))} ${text}`] : [];
  }
  if (tag === "UL" || tag === "OL") {
    const items = el.childNodes.filter((child) => child.tagName === "LI").map(listItem).filter(Boolean);
    return items.length ? [items.join("\n")] : [];
  }
  if (tag === "LI") return [listItem(el)].filter(Boolean);
  if (tag === "TABLE") {
    const rows = tableRows(el).filter(Boolean);
    return rows.length ? [rows.join("\n")] : [];
  }
  return blocksOf(el);
}

/** Blocks inside an element, in document order. Runs of inline content become one paragraph. */
function blocksOf(node) {
  const blocks = [];
  let run = "";
  const flush = () => {
    const text = clean(run);
    if (text) blocks.push(text);
    run = "";
  };
  for (const child of node.childNodes) {
    if (child.nodeType === NodeType.TEXT_NODE) {
      run += child.text;
    } else if (child.nodeType === NodeType.ELEMENT_NODE && !isSkipped(child)) {
      if (BLOCK_TAGS.has(child.tagName) || child.tagName === "TABLE") {
        flush();
        blocks.push(...blockFor(child));
      } else {
        run += inlineText(child);
      }
    }
  }
  flush();
  return blocks;
}

/** Plain text for a <main> element: blocks separated by blank lines. */
export function mainText(main) {
  return blocksOf(main).join("\n\n");
}
