# Lalaland

A small, static personal website — plain HTML, CSS, and vanilla JavaScript.
No framework, no build step, no dependencies for the site itself.

## Preview it locally

The Essays page loads text with `fetch()`, which browsers block over `file://`.
So preview through a tiny local web server rather than double-clicking the file:

```
python -m http.server 8000
```

Then open <http://localhost:8000> in your browser. (Stop the server with Ctrl+C.)

## Project structure

```
.
├── index.html        # Home: hero photo + Vimeo video + intro, "Life and Views", call-out
├── essays.html       # Essays: accordion list, each with a Download PDF button
├── contact.html      # Contact: placeholder details + photo
├── style.css         # All styling. Colours live as CSS variables in :root (top of file)
├── script.js         # Accordion open/close + loads essay text from the .md files
├── build_pdfs.py     # Regenerates the essay PDFs from the .md files (stdlib only)
├── essays/           # Source text for each essay — the single source of truth
│   ├── religion.md   # (one .md file per essay, named by topic)
│   ├── work.md
│   ├── nukes-and-democracy.md
│   ├── balding.md
│   ├── capitalism.md
│   └── abortion.md
└── assets/
    ├── img/          # Images (placeholder SVGs — swap for your own)
    │   ├── hero.svg
    │   └── contact.svg
    └── pdf/          # Pre-generated essay PDFs (one per .md, built by build_pdfs.py)
        ├── religion.pdf
        ├── work.pdf
        └── ...
```

## Editing content

- **Colours / look:** edit the CSS variables at the top of `style.css` (`:root`).
- **Wordmark:** change "Lalaland" in the nav and footer of each `.html` file.
- **Vimeo video:** in `index.html`, replace the video ID in the `player.vimeo.com`
  URL (there's a clearly marked comment showing exactly where).
- **Essays:** edit `essays/essay-N.md`. The website shows that text automatically.
  To update the downloadable PDF too, re-run `python build_pdfs.py`.

## Deploy (Cloudflare Pages)

This is a static site, so point Cloudflare Pages at the repo with **no build
command** and the project root as the output directory. Every file is well under
Cloudflare's 25 MiB per-file limit.
