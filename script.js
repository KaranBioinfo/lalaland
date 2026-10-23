/* =============================================================================
   script.js — the only JavaScript on the site.

   Two independent features, each self-contained so the file can be loaded on
   every page safely (each one quietly does nothing if its markup isn't present):

     1. initVideoLightbox() — click the video preview to play it big in an
        overlay (used on the Home page).
     2. initEssays()        — load each essay's text from its .md file and
        expand/collapse it (used on the Essays page).

   Plain, framework-free JavaScript.
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  initVideoLightbox();
  initEssays();
});


/* =============================================================================
   1. VIDEO LIGHTBOX
   A ".video" element holds a clickable facade and a data-vimeo-src URL. On
   click we drop a fresh autoplaying <iframe> into the shared #video-modal,
   show it, and on close we remove the iframe again (which stops playback).
   ========================================================================== */
function initVideoLightbox() {
  const triggers = document.querySelectorAll(".video__facade");
  const modal = document.getElementById("video-modal");
  if (triggers.length === 0 || !modal) return; // nothing to wire up on this page

  const frame = modal.querySelector(".video-modal__frame");
  const closeBtn = modal.querySelector(".video-modal__close");
  let lastFocused = null; // so we can restore focus when the modal closes

  // Open the lightbox for a given facade's video.
  triggers.forEach((btn) => {
    btn.addEventListener("click", () => {
      const src = btn.closest(".video").getAttribute("data-vimeo-src");
      if (src) openModal(src, btn);
    });
  });

  // Anything marked data-close (the ✕ and the dark backdrop) closes the modal.
  modal.querySelectorAll("[data-close]").forEach((el) => {
    el.addEventListener("click", closeModal);
  });

  // Esc closes it too.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeModal();
  });

  function openModal(src, trigger) {
    lastFocused = trigger;

    // Add autoplay to the URL (handle whether it already has a "?" or not).
    const joiner = src.includes("?") ? "&" : "?";
    const iframe = document.createElement("iframe");
    iframe.src = src + joiner + "autoplay=1";
    iframe.title = "Vimeo video player";
    iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media";
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("allowfullscreen", "");
    frame.appendChild(iframe);

    modal.hidden = false;
    document.body.style.overflow = "hidden"; // stop the page scrolling behind
    closeBtn.focus();
  }

  function closeModal() {
    modal.hidden = true;
    frame.innerHTML = "";               // remove the iframe -> stops the video
    document.body.style.overflow = "";  // restore page scrolling
    if (lastFocused) lastFocused.focus();
  }
}


/* =============================================================================
   2. ESSAYS (accordion + load text from .md files)
   ========================================================================== */
function initEssays() {
  const toggles = document.querySelectorAll(".essay__toggle");
  if (toggles.length === 0) return; // not the essays page

  // --- Load each essay's text from its .md file ------------------------------
  toggles.forEach((toggle) => {
    const mdPath = toggle.getAttribute("data-essay");
    if (!mdPath) return;

    const panel = document.getElementById(toggle.getAttribute("aria-controls"));
    const textEl = panel.querySelector(".essay__text");

    fetch(mdPath)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.text();
      })
      .then((markdown) => {
        textEl.innerHTML = renderMarkdown(markdown);
      })
      .catch((err) => {
        // Most common cause: opening the page via file:// (fetch is blocked).
        textEl.innerHTML =
          '<p style="color:var(--color-text-muted)">Could not load this essay. ' +
          "If you opened the page by double-clicking the file, run it through a " +
          "local server instead (see the preview command in the README).</p>";
        console.warn(`Failed to load ${mdPath}:`, err);
      });
  });

  // --- Expand / collapse -----------------------------------------------------
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const panel = document.getElementById(toggle.getAttribute("aria-controls"));
      const isOpen = toggle.getAttribute("aria-expanded") === "true";
      if (isOpen) closePanel(toggle, panel);
      else openPanel(toggle, panel);
    });
  });

  /* Open: set max-height to the content's real height so the CSS transition
     animates from 0 up to it, then clear it so the panel can resize freely. */
  function openPanel(toggle, panel) {
    toggle.setAttribute("aria-expanded", "true");
    panel.style.maxHeight = panel.scrollHeight + "px";
    panel.addEventListener("transitionend", function clear(e) {
      if (e.propertyName === "max-height") {
        panel.style.maxHeight = "none";
        panel.removeEventListener("transitionend", clear);
      }
    });
  }

  /* Close: set a concrete pixel height, force a reflow, then animate to 0. */
  function closePanel(toggle, panel) {
    toggle.setAttribute("aria-expanded", "false");
    panel.style.maxHeight = panel.scrollHeight + "px";
    // eslint-disable-next-line no-unused-expressions
    panel.offsetHeight; // force reflow so the next line actually animates
    panel.style.maxHeight = "0";
  }

  // --- A tiny Markdown renderer (headings, paragraphs, bold/italic) ----------
  function renderMarkdown(md) {
    const blocks = md.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);
    return blocks
      .map((block) => {
        const trimmed = block.trim();
        const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length;
          return `<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`;
        }
        const paragraph = trimmed.replace(/\n/g, " ");
        return `<p>${inline(escapeHtml(paragraph))}</p>`;
      })
      .join("\n");
  }

  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
}
