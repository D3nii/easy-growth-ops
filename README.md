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
writes `sitemap.xml` and `robots.txt`; each page's `lastmod` and "Updated" date come from the last
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

`public/og/{home,roi,drops}.png` (1200×630) are rendered from `scripts/og/template.html`:

```bash
npm run og
```

Needs Chrome (`CHROME_PATH` to override). Edit the copy in the template's `PAGES` object, re-run, and commit the PNGs.
