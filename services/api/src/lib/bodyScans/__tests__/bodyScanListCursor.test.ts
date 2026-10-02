import {
  bodyScanListCursorMatchesFilter,
  decodeBodyScanListCursor,
  encodeBodyScanListCursor,
} from "../bodyScanListCursor";

describe("bodyScanListCursor", () => {
  it("round-trips opaque cursor payload", () => {
    const encoded = encodeBodyScanListCursor({
      v: 1,
      id: "scan_abc",
      scanType: "inbody",
    });
    expect(typeof encoded).toBe("string");
    expect(encoded.length).toBeGreaterThan(8);
    expect(decodeBodyScanListCursor(encoded)).toEqual({
      v: 1,
      id: "scan_abc",
      scanType: "inbody",
    });
  });

  it("rejects malformed / tampered cursors", () => {
    expect(decodeBodyScanListCursor("not-valid")).toBeNull();
    expect(decodeBodyScanListCursor("")).toBeNull();
    expect(
      decodeBodyScanListCursor(
        Buffer.from(JSON.stringify({ v: 2, id: "x", scanType: null }), "utf8").toString(
          "base64url",
        ),
      ),
    ).toBeNull();
    expect(
      decodeBodyScanListCursor(
        Buffer.from(
          JSON.stringify({ v: 1, id: "x", scanType: "not-a-type" }),
          "utf8",
        ).toString("base64url"),
      ),
    ).toBeNull();
  });

  it("binds cursor to category filter", () => {
    const payload = { v: 1 as const, id: "s1", scanType: "dxa" as const };
    expect(bodyScanListCursorMatchesFilter(payload, "dxa")).toBe(true);
    expect(bodyScanListCursorMatchesFilter(payload, "inbody")).toBe(false);
    expect(bodyScanListCursorMatchesFilter({ v: 1, id: "s1", scanType: null }, undefined)).toBe(
      true,
    );
    expect(bodyScanListCursorMatchesFilter({ v: 1, id: "s1", scanType: null }, "dxa")).toBe(false);
  });
});
