/* =============================================================================
   script.js — the only JavaScript on the site.

   Two jobs, both for the Essays page:
     1. Load each essay's text from its source .md file into its panel.
     2. Expand / collapse essays with a smooth accordion animation.

   Written in plain, framework-free JavaScript. It runs on every page because
   index.html/contact.html simply don't include this file — only essays.html
   does — but the code also no-ops safely if there are no essays on the page.
   ========================================================================== */

/* Wait until the HTML is fully parsed before touching the DOM. */
document.addEventListener("DOMContentLoaded", () => {

  // Grab every accordion toggle button on the page.
  const toggles = document.querySelectorAll(".essay__toggle");

  // If there are none (e.g. on Home or Contact), there's nothing to do.
  if (toggles.length === 0) return;

  // ---------------------------------------------------------------------------
  // 1. LOAD ESSAY TEXT FROM THE .md FILES
  // Each toggle has a data-essay="essays/essay-N.md" attribute. We fetch that
  // file and drop its rendered text into the matching .essay__text container.
  // ---------------------------------------------------------------------------
  toggles.forEach((toggle) => {
    const mdPath = toggle.getAttribute("data-essay");
    if (!mdPath) return;

    // The text container is inside the panel this toggle controls.
    const panelId = toggle.getAttribute("aria-controls");
    const panel = document.getElementById(panelId);
    const textEl = panel.querySelector(".essay__text");

    // Fetch the markdown file, then convert it to simple HTML.
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

  // ---------------------------------------------------------------------------
  // 2. ACCORDION OPEN / CLOSE
  // Clicking a toggle opens its panel (and, for a clean single-open feel, we
  // leave other panels as they are — change the loop below if you'd rather
  // auto-close the others).
  // ---------------------------------------------------------------------------
  toggles.forEach((toggle) => {
    toggle.addEventListener("click", () => {
      const panel = document.getElementById(toggle.getAttribute("aria-controls"));
      // aria-expanded is the single source of truth for open/closed state.
      const isOpen = toggle.getAttribute("aria-expanded") === "true";

      if (isOpen) {
        closePanel(toggle, panel);
      } else {
        openPanel(toggle, panel);
      }
    });
  });

  /* Open one panel: set max-height to its real content height so the CSS
     transition animates smoothly from 0 to that height. */
  function openPanel(toggle, panel) {
    toggle.setAttribute("aria-expanded", "true");
    // scrollHeight is the full height the content needs, even while collapsed.
    panel.style.maxHeight = panel.scrollHeight + "px";

    // After the open animation finishes, remove the fixed max-height so the
    // panel can grow/shrink freely if its content changes (e.g. images load).
    panel.addEventListener("transitionend", function clear(e) {
      if (e.propertyName === "max-height") {
        panel.style.maxHeight = "none";
        panel.removeEventListener("transitionend", clear);
      }
    });
  }

  /* Close one panel: we must first set a concrete pixel height (since it may
     currently be "none"), force a reflow, then set it back to 0 so the browser
     has two numeric values to animate between. */
  function closePanel(toggle, panel) {
    toggle.setAttribute("aria-expanded", "false");
    panel.style.maxHeight = panel.scrollHeight + "px";
    // eslint-disable-next-line no-unused-expressions
    panel.offsetHeight; // force reflow so the next line actually animates
    panel.style.maxHeight = "0";
  }

  // ---------------------------------------------------------------------------
  // 3. A TINY MARKDOWN RENDERER
  // Just enough to display the placeholder essays nicely: headings (#, ##, ###),
  // paragraphs separated by blank lines, and **bold** / *italic* inline marks.
  // It is intentionally minimal — not a full Markdown parser.
  // ---------------------------------------------------------------------------
  function renderMarkdown(md) {
    // Normalise line endings and split into blocks on blank lines.
    const blocks = md.replace(/\r\n/g, "\n").trim().split(/\n{2,}/);

    return blocks
      .map((block) => {
        const trimmed = block.trim();

        // Headings: count the leading # characters.
        const heading = trimmed.match(/^(#{1,3})\s+(.*)$/);
        if (heading) {
          const level = heading[1].length; // 1, 2 or 3
          return `<h${level}>${inline(escapeHtml(heading[2]))}</h${level}>`;
        }

        // Otherwise it's a paragraph. Join wrapped lines with a space.
        const paragraph = trimmed.replace(/\n/g, " ");
        return `<p>${inline(escapeHtml(paragraph))}</p>`;
      })
      .join("\n");
  }

  /* Convert **bold** and *italic* after the text has been HTML-escaped. */
  function inline(text) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
  }

  /* Escape HTML special characters so essay text can't inject markup. */
  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }
});
