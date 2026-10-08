# Easy Growth Ops

Marketing tools for performance marketing teams.

Two products:

1. **ROI** — see what actually paid back
2. **Drops** — daily industry-winning videos sent to Slack

Site: [www.geteasygrowthops.co](https://www.geteasygrowthops.co/)
(`easy-growth-ops.jamilglobal.com` 301s to it via `vercel.json`; Vercel's domain settings 308 the bare
`geteasygrowthops.co` to www).

## Config

[`site.config.js`](site.config.js) holds `SITE_URL` (the canonical origin) and `PAGES` (Vite build
inputs + sitemap entries). HTML pages use `__SITE_URL__` / `__SITE_DOMAIN__` tokens that
`scripts/vite-site-plugin.js` replaces in dev and build. The same plugin writes `sitemap.xml` and
`robots.txt` from `SITE_URL`.

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
