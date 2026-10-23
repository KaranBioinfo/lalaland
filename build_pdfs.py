#!/usr/bin/env python3
# =============================================================================
# build_pdfs.py — regenerate the essay PDFs from the Markdown source files.
#
# WHY THIS EXISTS
#   Each essay's text lives in essays/essay-N.md. The website reads those files
#   directly, and this script turns the SAME files into matching PDFs in
#   assets/pdf/. So there is one source of truth: edit a .md file, re-run this
#   script, and both the on-page text and the downloadable PDF stay in sync.
#
# HOW TO RUN
#   python build_pdfs.py
#
# DEPENDENCIES
#   None. This uses only the Python standard library and writes the PDF file
#   format by hand, so there is nothing to install.
#
# WHAT IT SUPPORTS
#   A small slice of Markdown, enough for the placeholder essays:
#     # / ## / ###  headings
#     blank-line-separated paragraphs
#   (It does not parse bold/italic for the PDF — keep the PDFs clean and simple.)
# =============================================================================

import glob
import os
import zlib

# --- Page geometry (US Letter, in PDF points; 72 points = 1 inch) -----------
PAGE_W, PAGE_H = 612, 792
MARGIN = 72
CONTENT_W = PAGE_W - 2 * MARGIN          # usable text width = 468 pt
TOP_Y = PAGE_H - MARGIN                   # first baseline sits near the top
BOTTOM_Y = MARGIN                         # stop adding lines below this

# --- Fonts we use (two of the 14 standard PDF fonts; no embedding needed) ----
FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

# Body text and heading styles: (font, size, space-before, space-after) in pt.
STYLE_BODY = (FONT_REGULAR, 11, 0, 8)
STYLE_H1   = (FONT_BOLD, 20, 0, 14)       # "# Title"
STYLE_H2   = (FONT_BOLD, 15, 14, 8)       # "## Section"
STYLE_H3   = (FONT_BOLD, 13, 10, 6)       # "### Subsection"
LINE_SPACING = 1.4                        # line height = size * this

# -----------------------------------------------------------------------------
# Helvetica character widths (in 1000ths of an em), from the standard AFM
# metrics. Used to wrap lines at the right place. Helvetica-Bold is slightly
# wider, so we scale these up a touch for bold text — close enough for layout.
# -----------------------------------------------------------------------------
HELV_WIDTHS = {
    ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667,
    "'": 191, '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333,
    '.': 278, '/': 278, '0': 556, '1': 556, '2': 556, '3': 556, '4': 556,
    '5': 556, '6': 556, '7': 556, '8': 556, '9': 556, ':': 278, ';': 278,
    '<': 584, '=': 584, '>': 584, '?': 556, '@': 1015, 'A': 667, 'B': 667,
    'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778, 'H': 722, 'I': 278,
    'J': 500, 'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778, 'P': 667,
    'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944,
    'X': 667, 'Y': 667, 'Z': 611, '[': 278, '\\': 278, ']': 278, '^': 469,
    '_': 556, '`': 333, 'a': 556, 'b': 556, 'c': 500, 'd': 556, 'e': 556,
    'f': 278, 'g': 556, 'h': 556, 'i': 222, 'j': 222, 'k': 500, 'l': 222,
    'm': 833, 'n': 556, 'o': 556, 'p': 556, 'q': 556, 'r': 333, 's': 500,
    't': 278, 'u': 556, 'v': 500, 'w': 722, 'x': 500, 'y': 500, 'z': 500,
    '{': 334, '|': 260, '}': 334, '~': 584,
    # A few common non-ASCII characters we actually use (em dash, curly quotes).
    '—': 1000, '–': 556, '‘': 222, '’': 222,
    '“': 333, '”': 333,
}
DEFAULT_WIDTH = 556          # fallback width for any character not listed above
BOLD_SCALE = 1.06            # bold glyphs run ~6% wider than regular


def text_width(text, size, bold=False):
    """Return the rendered width of `text` at `size` points."""
    units = sum(HELV_WIDTHS.get(ch, DEFAULT_WIDTH) for ch in text)
    width = units / 1000.0 * size
    return width * BOLD_SCALE if bold else width


def wrap(text, size, bold, max_width):
    """Greedy word-wrap: return a list of lines that each fit in max_width."""
    words = text.split()
    lines, current = [], ""
    for word in words:
        trial = word if current == "" else current + " " + word
        if text_width(trial, size, bold) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines or [""]


def parse_markdown(md):
    """Turn Markdown text into a list of (style, text) blocks."""
    blocks = []
    for raw in md.replace("\r\n", "\n").strip().split("\n\n"):
        block = raw.strip()
        if not block:
            continue
        if block.startswith("### "):
            blocks.append((STYLE_H3, block[4:].strip()))
        elif block.startswith("## "):
            blocks.append((STYLE_H2, block[3:].strip()))
        elif block.startswith("# "):
            blocks.append((STYLE_H1, block[2:].strip()))
        else:
            # Collapse internal line breaks within a paragraph into spaces.
            blocks.append((STYLE_BODY, " ".join(block.split("\n"))))
    return blocks


def layout(blocks):
    """Flow blocks into pages. Returns a list of pages; each page is a list of
    (x, y, font, size, text) line-placement tuples."""
    pages, page = [], []
    y = TOP_Y
    for (font, size, space_before, space_after), text in blocks:
        bold = font == FONT_BOLD
        line_height = size * LINE_SPACING

        y -= space_before
        for line in wrap(text, size, bold, CONTENT_W):
            # Start a new page if this line would fall below the bottom margin.
            if y - line_height < BOTTOM_Y:
                pages.append(page)
                page, y = [], TOP_Y
            y -= line_height
            page.append((MARGIN, y, font, size, line))
        y -= space_after

    pages.append(page)
    return pages


def pdf_escape(text):
    """Escape the characters that are special inside a PDF text string."""
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def build_pdf(pages):
    """Assemble the pages into PDF file bytes, with a correct xref table."""
    # Object plan:
    #   1 = Catalog, 2 = Pages tree, 3 = Helvetica, 4 = Helvetica-Bold,
    #   then for each page: one Page object + one content-stream object.
    n_pages = len(pages)
    page_obj_ids = [5 + 2 * i for i in range(n_pages)]
    content_ids = [6 + 2 * i for i in range(n_pages)]
    total_objs = 4 + 2 * n_pages

    objects = {}  # object number -> bytes of its body

    objects[1] = b"<< /Type /Catalog /Pages 2 0 R >>"

    kids = " ".join(f"{pid} 0 R" for pid in page_obj_ids)
    objects[2] = f"<< /Type /Pages /Count {n_pages} /Kids [{kids}] >>".encode("latin-1")

    # Both fonts use WinAnsiEncoding so the em dash / curly quotes render right.
    objects[3] = (b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica "
                  b"/Encoding /WinAnsiEncoding >>")
    objects[4] = (b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold "
                  b"/Encoding /WinAnsiEncoding >>")

    for i, lines in enumerate(pages):
        # --- content stream: draw every line with BT ... Tf ... Td ... Tj ET
        parts = []
        for x, y, font, size, text in lines:
            font_res = "F1" if font == FONT_REGULAR else "F2"
            # Encode to cp1252 (WinAnsi); drop anything that can't be shown.
            encoded = pdf_escape(text).encode("cp1252", "replace").decode("cp1252")
            parts.append(
                f"BT /{font_res} {size} Tf 1 0 0 1 {x:.2f} {y:.2f} Tm ({encoded}) Tj ET"
            )
        stream = ("\n".join(parts)).encode("cp1252", "replace")
        # Compress the stream to keep files small (FlateDecode = zlib/deflate).
        compressed = zlib.compress(stream)

        objects[content_ids[i]] = (
            f"<< /Length {len(compressed)} /Filter /FlateDecode >>\n"
            "stream\n"
        ).encode("latin-1") + compressed + b"\nendstream"

        objects[page_obj_ids[i]] = (
            f"<< /Type /Page /Parent 2 0 R "
            f"/MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> "
            f"/Contents {content_ids[i]} 0 R >>"
        ).encode("latin-1")

    # --- Serialise objects in order, recording each one's byte offset. -------
    out = bytearray(b"%PDF-1.4\n")
    offsets = {}
    for num in range(1, total_objs + 1):
        offsets[num] = len(out)
        out += f"{num} 0 obj\n".encode("latin-1") + objects[num] + b"\nendobj\n"

    # --- Cross-reference table + trailer -------------------------------------
    xref_pos = len(out)
    out += f"xref\n0 {total_objs + 1}\n".encode("latin-1")
    out += b"0000000000 65535 f \n"            # the mandatory free object 0
    for num in range(1, total_objs + 1):
        out += f"{offsets[num]:010d} 00000 n \n".encode("latin-1")
    out += (
        f"trailer\n<< /Size {total_objs + 1} /Root 1 0 R >>\n"
        f"startxref\n{xref_pos}\n%%EOF\n"
    ).encode("latin-1")

    return bytes(out)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    src_dir = os.path.join(here, "essays")
    out_dir = os.path.join(here, "assets", "pdf")
    os.makedirs(out_dir, exist_ok=True)

    md_files = sorted(glob.glob(os.path.join(src_dir, "essay-*.md")))
    if not md_files:
        print("No essays/essay-*.md files found — nothing to build.")
        return

    for md_path in md_files:
        name = os.path.splitext(os.path.basename(md_path))[0]  # e.g. "essay-1"
        with open(md_path, encoding="utf-8") as f:
            blocks = parse_markdown(f.read())
        pdf_bytes = build_pdf(layout(blocks))
        out_path = os.path.join(out_dir, name + ".pdf")
        with open(out_path, "wb") as f:
            f.write(pdf_bytes)
        print(f"  {os.path.relpath(md_path, here)}  ->  "
              f"{os.path.relpath(out_path, here)}  ({len(pdf_bytes):,} bytes)")

    print(f"Done. Built {len(md_files)} PDF(s) into assets/pdf/.")


if __name__ == "__main__":
    main()
