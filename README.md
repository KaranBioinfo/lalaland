# Lalaland

A small, static personal website — **plain HTML, CSS, and vanilla JavaScript**.
No framework, no build step, no dependencies for the site itself.

**Live at:** <https://lalaland.in> (also reachable at
<https://lalaland.karan42lala.workers.dev>).
Hosted on **Cloudflare Pages**, auto-deployed from GitHub (every file stays well
under Cloudflare's 25 MiB per-file limit).

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

## Hosting, domain & how a visitor reaches the site

The site is live at **https://lalaland.in**. Here is the full chain and who
does what.

### The deploy path — how your edits reach the internet

```
  your computer  ──git push──►  GitHub (KaranBioinfo/lalaland)
                                      │   Cloudflare watches this repo
                                      ▼
                             Cloudflare Pages  ──copies files worldwide──►  live site
                             (no build step — just serves the static files)
```

Every push to the `main` branch auto-deploys in about a minute. There is no
manual file upload.

### The request path — how a visitor reaches lalaland.in

```
  visitor types lalaland.in
        │
        ▼
  DNS lookup ("what's the address for lalaland.in?")
        │   answered by Cloudflare's nameservers (chan / justin.ns.cloudflare.com)
        ▼
  Cloudflare edge (the server nearest the visitor)
        │   serves your files over HTTPS (free auto-renewing certificate)
        ▼
  the browser downloads the files and draws Lalaland
```

### Who owns / controls what

| Piece                | Where            | What it does                                     |
|----------------------|------------------|--------------------------------------------------|
| The code             | GitHub           | master copy + full history of the site's files   |
| Hosting              | Cloudflare Pages | serves the files to visitors; auto-deploys        |
| The domain name      | Hostinger        | `lalaland.in` is registered (rented) here         |
| DNS for the domain   | Cloudflare       | nameservers point here, so the name maps to the site |
| Email `@lalaland.in` | Hostinger        | still works, via the MX/SPF/DKIM/DMARC records    |

### Key DNS records (Cloudflare dashboard → lalaland.in → DNS)

- **`lalaland.in` → the Cloudflare Pages project.** Created automatically when
  the domain was added under the project's **Custom domains** tab — this is what
  points the domain at your site. (The original Hostinger `A`/`AAAA` records,
  which pointed at Hostinger's own server, were deleted so the site could take
  over the apex.)
- **`www.lalaland.in`** → CNAME to `lalaland.in`.
- **Email records, left untouched:** two `MX` (mx1/mx2.hostinger.com), `TXT`
  SPF and DMARC, and the `hostingermail-*._domainkey` / `autoconfig` /
  `autodiscover` CNAMEs.

### Recreating this hosting from scratch

1. Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → pick the
   `lalaland` repo. Framework preset **None**, build command **empty**, output
   directory `/`. Save and Deploy → gives a free `*.workers.dev` / `*.pages.dev`
   address.
2. Add the domain to Cloudflare (**Add a domain**), then at Hostinger change the
   domain's **nameservers** to the two Cloudflare ones. Wait for it to go Active.
3. In the Pages project → **Custom domains** → add `lalaland.in` (and
   `www.lalaland.in`). Cloudflare creates the DNS record and the HTTPS cert.

### Troubleshooting: "it still shows an old page"

That's almost always a **stale DNS cache on your own device**, not a server
problem. The live site is whatever the Cloudflare address
(`lalaland.karan42lala.workers.dev`) serves. Fix your device with
`ipconfig /flushdns` (run as administrator) and an incognito window, restart the
computer, or just wait an hour for the cache to expire. A different device or
your phone on mobile data will show the current site immediately.
