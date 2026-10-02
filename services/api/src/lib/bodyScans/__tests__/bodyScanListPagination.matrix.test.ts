/**
 * History size / pagination integrity matrix for filtered list pages.
 * Pure pagination helper mirroring the server over-fetch contract.
 */
import {
  bodyScanListCursorMatchesFilter,
  decodeBodyScanListCursor,
  encodeBodyScanListCursor,
} from "../bodyScanListCursor";

type Item = { id: string; createdAt: string; scanType: string };

function pageItems(
  all: Item[],
  opts: { limit: number; afterId?: string | null },
): { items: Item[]; hasMore: boolean; nextCursor: string | null } {
  const sorted = [...all].sort((a, b) => {
    if (a.createdAt === b.createdAt) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  let start = 0;
  if (opts.afterId) {
    const idx = sorted.findIndex((i) => i.id === opts.afterId);
    start = idx >= 0 ? idx + 1 : sorted.length;
  }
  const window = sorted.slice(start, start + opts.limit + 1);
  const hasMore = window.length > opts.limit;
  const page = hasMore ? window.slice(0, opts.limit) : window;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? encodeBodyScanListCursor({ v: 1, id: last.id, scanType: "dxa" })
      : null;
  return { items: page, hasMore: hasMore && nextCursor != null, nextCursor };
}

function collectAll(all: Item[], limit: number): string[] {
  const seen: string[] = [];
  let cursor: string | null = null;
  for (let guard = 0; guard < 1000; guard++) {
    const afterId = cursor ? decodeBodyScanListCursor(cursor)?.id ?? null : null;
    const page = pageItems(all, { limit, afterId });
    for (const item of page.items) {
      if (seen.includes(item.id)) throw new Error(`duplicate ${item.id}`);
      seen.push(item.id);
    }
    if (!page.hasMore || !page.nextCursor) {
      expect(page.nextCursor).toBeNull();
      expect(page.hasMore).toBe(false);
      break;
    }
    cursor = page.nextCursor;
    expect(bodyScanListCursorMatchesFilter(decodeBodyScanListCursor(cursor)!, "dxa")).toBe(true);
  }
  return seen;
}

describe("Body Scan filtered pagination size matrix", () => {
  const sizes = [0, 1, 24, 25, 49, 50, 51, 100, 101];

  it.each(sizes)("reaches every scan exactly once for n=%i (limit=25)", (n) => {
    const all: Item[] = Array.from({ length: n }, (_, i) => ({
      id: `s_${String(i).padStart(4, "0")}`,
      createdAt: `2026-03-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
      scanType: "dxa",
    }));
    const seen = collectAll(all, 25);
    expect(seen).toHaveLength(n);
    expect(new Set(seen).size).toBe(n);
    for (const item of all) {
      expect(seen).toContain(item.id);
    }
  });

  it("first page is nonempty when category has scans", () => {
    const all: Item[] = Array.from({ length: 51 }, (_, i) => ({
      id: `s_${i}`,
      createdAt: `2026-01-01T${String(i).padStart(2, "0")}:00:00.000Z`,
      scanType: "dxa",
    }));
    const first = pageItems(all, { limit: 25 });
    expect(first.items.length).toBe(25);
    expect(first.hasMore).toBe(true);
    expect(first.nextCursor).not.toBeNull();
  });
});
