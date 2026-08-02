# Positional PDF text retention (Phase 3D-A)

Positional `PdfTextItem` arrays from pdfjs are **transient processing artifacts**.

## Decision

- Prefer in-memory use during extraction / verification only.
- Do **not** expose raw positional text to the mobile client.
- Do **not** log report text, analyte labels, values, or coordinates with PHI.
- Persist only minimized source locators (e.g. `positional:p{N}:x{x}:y{y}`) and
  structural evidence (policy/parser versions, page number, consensus status).
- Full positional arrays may be retained in account export packages when required
  for audit, but are not a long-lived Labs query surface.

Bounded caps: pages, text items, serialized size, and extraction timeout.
