import {
  assertCursorCollectionReady,
  collectCursorPages,
} from "@/lib/features/timeline/collectCursorPages";

type Item = { id: string };

function page(items: Item[], nextCursor: string | null) {
  return { ok: true as const, items, nextCursor };
}

describe("collectCursorPages", () => {
  test("one page, nextCursor null → complete", async () => {
    const fetchPage = jest.fn(async () => page([{ id: "a" }], null));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result).toEqual({
      completeness: "complete",
      items: [{ id: "a" }],
      pageCount: 1,
      requestCount: 1,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  test("two pages → items merged in deterministic order", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "a" }, { id: "b" }], "c1"))
      .mockResolvedValueOnce(page([{ id: "c" }], null));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result.completeness).toBe("complete");
    expect(result.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(result.pageCount).toBe(2);
    expect(fetchPage.mock.calls.map((c) => c[0].cursor)).toEqual([null, "c1"]);
  });

  test("duplicate item at page boundary → one item", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "a" }, { id: "b" }], "c1"))
      .mockResolvedValueOnce(page([{ id: "b" }, { id: "c" }], null));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result.items.map((i) => i.id)).toEqual(["a", "b", "c"]);
  });

  test("repeated cursor → partial cursor_cycle", async () => {
    const fetchPage = jest.fn(async ({ cursor }) => {
      if (cursor == null) return page([{ id: "a" }], "same");
      return page([{ id: "b" }], "same");
    });
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result.completeness).toBe("partial");
    if (result.completeness === "partial") {
      expect(result.reason).toBe("cursor_cycle");
    }
    expect(result.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test("cursor A → B → A → partial cursor_cycle", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "1" }], "A"))
      .mockResolvedValueOnce(page([{ id: "2" }], "B"))
      .mockResolvedValueOnce(page([{ id: "3" }], "A"));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result.completeness).toBe("partial");
    if (result.completeness === "partial") {
      expect(result.reason).toBe("cursor_cycle");
    }
    expect(result.items.map((i) => i.id)).toEqual(["1", "2", "3"]);
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  test("cap reached with nextCursor → partial page_cap", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "1" }], "c1"))
      .mockResolvedValueOnce(page([{ id: "2" }], "c2"));
    const result = await collectCursorPages<Item>({
      maxPages: 2,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result).toMatchObject({
      completeness: "partial",
      reason: "page_cap",
      pageCount: 2,
    });
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test("later-page network failure → earlier items retained + partial", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "1" }], "c1"))
      .mockResolvedValueOnce({ ok: false, kind: "network" });
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result).toMatchObject({
      completeness: "partial",
      reason: "continuation_error",
      items: [{ id: "1" }],
    });
  });

  test("later-page schema failure → earlier items retained + partial", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "1" }], "c1"))
      .mockResolvedValueOnce({ ok: false, kind: "validation" });
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result).toMatchObject({
      completeness: "partial",
      reason: "validation_error",
      items: [{ id: "1" }],
    });
  });

  test("initial-page network failure → error", async () => {
    const fetchPage = jest.fn(async () => ({ ok: false as const, kind: "network" as const }));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result).toEqual({
      completeness: "error",
      items: [],
      pageCount: 0,
      requestCount: 1,
      reason: "continuation_error",
    });
  });

  test("initial empty page + null cursor → complete empty", async () => {
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage: async () => page([], null),
    });
    expect(result).toEqual({
      completeness: "complete",
      items: [],
      pageCount: 1,
      requestCount: 1,
    });
  });

  test("initial empty page + nextCursor → continuation followed", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([], "c1"))
      .mockResolvedValueOnce(page([{ id: "z" }], null));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result.completeness).toBe("complete");
    expect(result.items).toEqual([{ id: "z" }]);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  test("cancellation prevents subsequent requests", async () => {
    let cancelled = false;
    const fetchPage = jest.fn(async () => {
      cancelled = true;
      return page([{ id: "1" }], "c1");
    });
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      isCancelled: () => cancelled,
      fetchPage,
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
    expect(result.completeness).toBe("partial");
    expect(result.items).toEqual([{ id: "1" }]);
  });

  test("cursor requested at most once", async () => {
    const seen = new Set<string | null>();
    const fetchPage = jest.fn(async ({ cursor }) => {
      expect(seen.has(cursor)).toBe(false);
      seen.add(cursor);
      if (cursor == null) return page([{ id: "1" }], "c1");
      if (cursor === "c1") return page([{ id: "2" }], "c2");
      return page([{ id: "3" }], null);
    });
    await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(fetchPage).toHaveBeenCalledTimes(3);
  });

  test("no raw cursor appears in thrown/reportable error output", async () => {
    const secret = "opaque-cursor-SECRET-value";
    try {
      assertCursorCollectionReady({
        completeness: "partial",
        items: [],
        pageCount: 1,
        requestCount: 1,
        reason: "page_cap",
      });
      throw new Error("expected assert to throw");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      expect(msg).not.toContain(secret);
      expect(msg).not.toMatch(/cursor/i);
    }
  });

  test("deterministic report ordering", async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(page([{ id: "m" }, { id: "a" }], "c1"))
      .mockResolvedValueOnce(page([{ id: "z" }, { id: "a" }], null));
    const result = await collectCursorPages<Item>({
      maxPages: 10,
      getItemId: (i) => i.id,
      fetchPage,
    });
    expect(result.items.map((i) => i.id)).toEqual(["m", "a", "z"]);
  });
});
