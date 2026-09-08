import { inject } from "@vercel/analytics";
import "./style.css";

inject();

const BOOK_URL = "https://calendly.com/danyal-jamil/30min";

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
