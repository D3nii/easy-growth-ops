# Easy Growth Ops

Marketing tools for performance marketing teams.

Two products:

1. **ROI** — see what actually paid back
2. **Drops** — daily industry-winning videos sent to Slack

Site: [easy-growth-ops.jamilglobal.com](https://easy-growth-ops.jamilglobal.com/)

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
