import crypto from "node:crypto";
import { stableStringify } from "../canonicalImmutability";

function sha256Hex(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

describe("canonicalImmutability helpers", () => {
  it("stableStringify sorts keys deterministically (including nested objects)", () => {
    const a = { b: 1, a: 2, c: { y: 1, x: 2 } };
    const b = { a: 2, b: 1, c: { x: 2, y: 1 } };

    expect(stableStringify(a)).toBe(stableStringify(b));
  });

  it("stableStringify preserves array order (arrays are not key-sorted)", () => {
    const a = { xs: [1, 2, 3] };
    const b = { xs: [1, 3, 2] };

    expect(stableStringify(a)).not.toBe(stableStringify(b));
  });

  it("hashing stableStringify output is stable for semantically identical objects", () => {
    const a = { id: "abc", meta: { x: 1, y: 2 }, data: { b: 1, a: 2 } };
    const b = { data: { a: 2, b: 1 }, meta: { y: 2, x: 1 }, id: "abc" };
    const c = { id: "abc", meta: { x: 1, y: 2 }, data: { b: 1, a: 999 } };

    const ha = sha256Hex(stableStringify(a));
    const hb = sha256Hex(stableStringify(b));
    const hc = sha256Hex(stableStringify(c));

    expect(ha).toBe(hb);
    expect(ha).not.toBe(hc);
  });
});
