export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;

export const ease = {
  linear: (x) => x,
  outCubic: (x) => 1 - (1 - x) ** 3,
  inCubic: (x) => x ** 3,
  inOutCubic: (x) => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  outQuint: (x) => 1 - (1 - x) ** 5,
  outExpo: (x) => (x === 1 ? 1 : 1 - 2 ** (-10 * x)),
  inExpo: (x) => (x === 0 ? 0 : 2 ** (10 * x - 10)),
  inOutExpo: (x) =>
    x === 0 || x === 1
      ? x
      : x < 0.5
        ? 2 ** (20 * x - 10) / 2
        : (2 - 2 ** (-20 * x + 10)) / 2,
  inOutQuart: (x) => (x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2),
  outBack: (x) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2;
  },
};

/** Eased 0..1 progress of a segment that starts at `start` and lasts `dur` seconds. */
export const seg = (t, start, dur, fn = ease.outExpo) => fn(clamp((t - start) / dur));

/** In/out envelope: eases in over `inDur` from `a`, holds, eases out over `outDur` ending at `b`. */
export const env = (t, a, b, inDur = 0.5, outDur = 0.4, fnIn = ease.outExpo, fnOut = ease.inCubic) =>
  Math.min(seg(t, a, inDur, fnIn), 1 - seg(t, b - outDur, outDur, fnOut));

export function h(tag, className = "", parent = null, text = null) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== null) el.textContent = text;
  if (parent) parent.appendChild(el);
  return el;
}

export function css(el, styles) {
  for (const [k, v] of Object.entries(styles)) {
    if (k.startsWith("--")) el.style.setProperty(k, v);
    else el.style[k] = v;
  }
}

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export const money = (n, digits = 2) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const SVG_NS = "http://www.w3.org/2000/svg";

export function svg(markup, className = "", parent = null) {
  const wrap = document.createElement("div");
  wrap.innerHTML = markup.trim();
  const el = wrap.firstElementChild;
  if (className) el.setAttribute("class", className);
  if (parent) parent.appendChild(el);
  return el;
}

function mountGrain(stage) {
  const grain = svg(
    `<svg width="1920" height="1080" viewBox="0 0 1920 1080">
      <filter id="grain-f"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="1" stitchTiles="stitch"/>
      <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0"/></filter>
      <rect width="100%" height="100%" filter="url(#grain-f)"/>
    </svg>`,
    "grain",
    stage,
  );
  const turb = grain.querySelector("feTurbulence");
  return (t, fps) => turb.setAttribute("seed", String(Math.floor(t * fps) % 97));
}

/**
 * Mounts a composition. With `?render` the page waits for a headless driver to call
 * `window.__seek(t)`; otherwise it loops in real time for previewing in a browser.
 */
export async function run({ duration, fps = 60, build, render }) {
  const stage = document.querySelector(".stage");
  await document.fonts.ready;
  const api = build(stage);
  const grain = mountGrain(stage);
  const bar = h("div", "progress", stage);

  const draw = (t) => {
    render(t, api);
    grain(t, fps);
    bar.style.transform = `scaleX(${clamp(t / duration)})`;
  };

  window.__composition = { duration, fps };
  window.__seek = (t) => draw(t);

  const params = new URLSearchParams(location.search);
  if (params.has("render")) {
    draw(0);
    window.__ready = true;
    return;
  }

  const fit = () => {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${s})`;
  };
  document.body.classList.add("preview");
  addEventListener("resize", fit);
  fit();

  const at = params.get("t");
  if (at !== null) {
    draw(Number(at));
    return;
  }
  const t0 = performance.now();
  const loop = (now) => {
    draw(((now - t0) / 1000) % duration);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
