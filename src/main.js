import { inject } from "@vercel/analytics";
import { BOOK_URL } from "../site.config.js";
import { initCtaTracking, initGa4 } from "./track.js";
import "./style.css";

inject();
initGa4();
initCtaTracking();

const year = document.querySelector("#year");
if (year) year.textContent = String(new Date().getFullYear());

document.querySelectorAll("[data-book]").forEach((el) => {
  if (el instanceof HTMLAnchorElement && !el.getAttribute("href")) {
    el.href = BOOK_URL;
  }
});

function loomId(url) {
  const match = String(url).match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return match?.[1] ?? "";
}

document.querySelectorAll("[data-loom]").forEach((slot) => {
  const id = loomId(slot.getAttribute("data-loom") || "");
  if (!id) return;

  const frame = document.createElement("iframe");
  frame.src = `https://www.loom.com/embed/${id}`;
  frame.title = "Product walkthrough";
  frame.allow = "autoplay; fullscreen; picture-in-picture";
  frame.allowFullscreen = true;
  slot.replaceChildren(frame);
});

if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  document.querySelectorAll(".loom video").forEach((video) => {
    video.removeAttribute("autoplay");
    video.pause();
    video.controls = true;
  });
}
