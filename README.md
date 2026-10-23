# Lalaland

A small, static personal website — **plain HTML, CSS, and vanilla JavaScript**.
No framework, no build step, no dependencies for the site itself. It's designed
to be hosted on **Cloudflare Pages** (every file stays well under the 25 MiB
per-file limit).

---

## Quick start: preview it locally

The Essays page loads text with `fetch()`, which browsers block when you open a
file directly (`file://`). So preview through a tiny local web server instead of
double-clicking `index.html`:

```
python -m http.server 8000
```

Then open <http://localhost:8000> and press Ctrl+F5 to hard-refresh after edits.
Stop the server with Ctrl+C.

---

## How the whole thing fits together (architecture)

The site is just **static files**. A browser requests them and renders them —
there is no server-side code and nothing is "compiled." Three kinds of file do
all the work:

```
            ┌─────────────┐     ┌─────────────┐     ┌──────────────┐
            │ index.html  │     │ essays.html │     │ contact.html │   ← the 3 pages
            └──────┬──────┘     └──────┬──────┘     └──────┬───────┘
                   │                   │                   │
         ┌─────────┴─────────┬─────────┴─────────┐         │
         ▼                   ▼                   ▼         ▼
   ┌───────────┐      ┌───────────┐     (every page links the SAME two files)
   │ style.css │      │ script.js │
   └───────────┘      └─────┬─────┘
   all styling,             │ on the Essays page only:
   colors as CSS            │  • fetches essays/<topic>.md  → shows the text
   variables in :root       │  • expands/collapses each essay
                            │ on the Home page only:
                            │  • click the video → opens the big lightbox player
```

**Key ideas:**

1. **One stylesheet controls the whole look.** Every colour, font and size is a
   CSS variable defined once at the top of `style.css` (in the `:root` block).
   Change a value there and it updates everywhere. The three HTML pages don't
   contain styling of their own.

2. **One script powers the interactive bits.** `script.js` is loaded by every
   page but each feature checks whether its markup exists, so it only does work
   where it's needed:
   - *Home:* the video "click-to-play" lightbox.
   - *Essays:* loading each essay's text and the expand/collapse accordion.

3. **Essays have a single source of truth.** Each essay's words live in one
   plain-text file, `essays/<topic>.md`. The website reads that file live and
   shows it; the matching PDF is generated from the *same* file. So you only
   ever edit the text in one place, and the page + PDF stay in sync.

4. **The video is hosted on Vimeo, not in the repo.** The page embeds a Vimeo
   player. This keeps the repo small and lets Vimeo handle streaming. (Source
   video files like `.mp4` are git-ignored on purpose.)

### Data flow for an essay (what happens when someone clicks "Religion")

```
  essays/religion.md  ──fetch()──►  script.js renders it  ──►  shown inside the
   (your text; first                 (tiny Markdown → HTML)      accordion panel
    "# Title" line =                                             on essays.html
    the subheading)
          │
          └── python build_pdfs.py ──►  assets/pdf/religion.pdf  (the Download PDF button)
```

---

## Project structure

```
.
├── index.html            # Home: split hero (text + video left, photo + caption right),
│                         #       "Life and Views", "New features coming soon", footer
├── essays.html           # Essays: accordion of 6 essays, each with a Download PDF button
├── contact.html          # Contact: placeholder details + photo
├── style.css             # ALL styling. Palette/fonts/sizes = CSS variables in :root
├── script.js             # Video lightbox (home) + essay load & accordion (essays)
├── build_pdfs.py         # Regenerates the essay PDFs from the .md files (stdlib only)
├── README.md             # This file
├── .gitignore            # Keeps private/local files (setup notes, source videos) out of git
├── essays/               # Source text — one .md file per essay (the single source of truth)
│   ├── religion.md
│   ├── work.md
│   ├── nukes-and-democracy.md
│   ├── balding.md
│   ├── capitalism.md
│   └── abortion.md
└── assets/
    ├── img/              # Images
    │   ├── hero.jpg      # The home-page hero photo
    │   ├── hero.svg      # (unused placeholder, kept as a fallback)
    │   └── contact.svg   # Placeholder portrait on the Contact page
    └── pdf/              # Pre-generated essay PDFs — one per .md, built by build_pdfs.py
        ├── religion.pdf
        ├── work.pdf
        ├── nukes-and-democracy.pdf
        ├── balding.pdf
        ├── capitalism.pdf
        └── abortion.pdf
```

---

## Editing the site

### Colours and fonts
Edit the CSS variables at the top of `style.css` (the `:root` block). For
example, `--color-accent` is the warm brown used for headings, links and
buttons; `--color-bg` is the background; `--fw-heading` controls how thin/bold
headings are.

### The wordmark ("Lalaland")
Change the text "Lalaland" in the nav and footer of each `.html` file. Its size
is set by `.site-nav .wordmark` in `style.css`.

### The hero photo
Put your image in `assets/img/` and point the page at it: in `index.html`, find
`src="assets/img/hero.jpg"` and change the filename. The caption beneath it is
the `<figcaption class="hero__caption">` right below that line.

### The video (Vimeo)
In `index.html`, find the comment `>>> YOUR REAL VIMEO URL lives in
data-vimeo-src <<<` and replace the URL in `data-vimeo-src`. The format is
`https://player.vimeo.com/video/<ID>?h=<HASH>` (the `?h=` hash is only needed
for unlisted videos). Clicking the preview opens the big player automatically.

### Editing an essay's text
1. Open the topic's file, e.g. `essays/religion.md`, in any text editor.
2. Keep the first line starting with `#` — the words after `#` are the essay's
   subheading. Put the essay body below it, with a blank line between paragraphs.
3. Save, then **rebuild the PDF** (see below). Refresh the browser to see it.

### Adding a new essay
1. Create `essays/<new-topic>.md` (same format as above).
2. In `essays.html`, copy one existing `<article class="essay">…</article>`
   block, paste it as another, and update the topic label plus the `id`,
   `aria-controls`, `data-essay` and the PDF `href` to the new name.
3. Run `python build_pdfs.py` to generate its PDF.

### Contact details
Edit the list in `contact.html` (the email, phone, and link rows).

---

## Regenerating the essay PDFs

The PDFs are built from the `.md` files by a small, dependency-free Python
script (it writes the PDF format by hand using only the standard library):

```
python build_pdfs.py
```

It reads every `essays/*.md` and writes a matching `assets/pdf/<topic>.pdf`.
Run it whenever you change an essay's text.

---

## Publishing changes (Git + GitHub)

The code lives at **https://github.com/KaranBioinfo/lalaland** (branch `main`).
Local edits don't appear on GitHub (or the live site) until you push them:

```
git add -A
git commit -m "describe what changed"
git push
```

---

## Going live (Cloudflare Pages)

This is a static site, so hosting needs **no build step**:

1. In the Cloudflare dashboard, go to **Workers & Pages → Create → Pages →
   Connect to Git** and choose the `lalaland` repo.
2. **Framework preset:** None. **Build command:** leave empty.
   **Build output directory:** `/` (the repo root).
3. **Save and Deploy.** Cloudflare gives you a `https://lalaland.pages.dev`
   address and automatically re-deploys every time you `git push` to `main`.
