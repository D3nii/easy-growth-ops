# Easy Growth Ops

Marketing tools for performance marketing teams.

Two products:

1. **ROI** — see what actually paid back
2. **Drops** — daily industry-winning videos sent to Slack

Site: [www.geteasygrowthops.co](https://www.geteasygrowthops.co/)
(`easy-growth-ops.jamilglobal.com` 301s to it via `vercel.json`; Vercel's domain settings 308 the bare
`geteasygrowthops.co` to www).

## Config

Site-wide settings live in [`site.config.js`](site.config.js):

- `SITE_URL`: canonical origin used by every canonical, `og:url`, `og:image`, JSON-LD URL, `sitemap.xml`, and `robots.txt`
- `GA4_MEASUREMENT_ID`: empty by default, so gtag.js never loads. Set it here or as `VITE_GA4_MEASUREMENT_ID` in Vercel
- `CONTACT_EMAIL`: footer and legal pages
- `PAGES`: every page (Vite build inputs + sitemap entries)

HTML pages use tokens (`__SITE_URL__`, `__SITE_DOMAIN__`, `__CONTACT_EMAIL__`, `__UPDATED_ISO__`,
`__UPDATED_HUMAN__`) that `scripts/vite-site-plugin.js` replaces in dev and build. The same plugin
writes `sitemap.xml`, `robots.txt`, and `llms.txt`; each page's `lastmod` and "Updated" date come from the last
git commit that touched that page.

## Local

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Walkthrough videos

`motion/roi.html` and `motion/drops.html` are code-driven motion pieces. Open
them with `npm run dev` at `/motion/roi.html` to preview in real time (`?t=6.5`
freezes a frame). To re-render the MP4s and posters in `public/walkthroughs/`:

```bash
npm run motion
```

Needs Chrome (`CHROME_PATH` to override) and ffmpeg.

## Social preview images

`public/og/*.png` (1200×630, one per key in the template) are rendered from `scripts/og/template.html`:

```bash
npm run og
```

Needs Chrome (`CHROME_PATH` to override). Edit the copy in the template's `PAGES` object, re-run, and commit the PNGs.
`npm run og -- <key>` renders a single image.

## Guides and integration pages

Content pages (guides, integration pages) share one template, [`layouts/content.html`](layouts/content.html),
rendered at build time by [`scripts/content-layout.js`](scripts/content-layout.js). Each page file only
holds its article body; the layout adds the head (title, description, canonical, Open Graph,
Twitter), nav, breadcrumbs, footer, and one JSON-LD `@graph`.

To add a page:

1. Add an entry to `PAGES` in `site.config.js` with `layout: "content"`, plus `title`, `h1`,
   `description`, `breadcrumb`, `schema` (`TechArticle`, `Article`, or `CollectionPage`),
   `published`, `ogImage`, `ogImageAlt`, `guide` (section + summary for the `/guides/` hub card),
   and `llms` (section + summary for `/llms.txt`). Set `software: true` to add ROI's
   `SoftwareApplication` node.
2. Create the HTML file at the entry's `file` path. Put `<!--@byline-->` right after the lede;
   it becomes the author line (Danyal Jamil, linked to the `#danyal` Person node) and the
   "Updated" date from git.
3. Optional structured data, read from the markup so schema always matches visible text:
   - FAQ: `<section data-faq>` with `.faq-item` elements, each an `h3` question + `.faq-a` answer → `FAQPage`
   - Steps: `<ol data-howto="HowTo name">` whose `li`s start with `<strong>Step name.</strong>` → `HowTo`
4. Tag CTAs with `data-cta`, `data-cta-type`, and `data-product` so `cta_click` fires.
5. Add an OG card to `scripts/og/template.html` and run `npm run og -- <key>`, or point
   `ogImage` at an existing image such as `roi`.
6. `npm run build`. The page appears in the build inputs, `sitemap.xml`, `/guides/`, and `/llms.txt`.

Links to pages that don't exist yet go in HTML comments marked `FUTURE:` so they can be found later.

## Screenshots

`public/shots/roi-bot-redacted.png` is the published ROI Slack screenshot with account and bot
names replaced. It is generated from the unredacted original in `scripts/source-images/`
(kept out of `public/` so it is never deployed):

```bash
python3 scripts/redact-roi-shot.py   # needs Pillow and the Lato font
```
