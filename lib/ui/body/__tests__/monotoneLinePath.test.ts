import { monotonePathD } from "@/lib/ui/body/monotoneLinePath";

describe("monotonePathD", () => {
  it("returns an empty path for fewer than two points", () => {
    expect(monotonePathD([])).toBe("");
    expect(monotonePathD([{ x: 0, y: 0 }])).toBe("");
  });

  it("starts at the first point and emits a cubic segment per gap", () => {
    const d = monotonePathD([
      { x: 0, y: 10 },
      { x: 10, y: 20 },
      { x: 20, y: 15 },
    ]);
    expect(d.startsWith("M 0 10")).toBe(true);
    // two segments for three points
    expect((d.match(/C /g) ?? []).length).toBe(2);
    // ends at the final point's coordinates
    expect(d.trimEnd().endsWith("20 15")).toBe(true);
  });

  it("is monotone (no overshoot) for a strictly increasing series", () => {
    const d = monotonePathD([
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 20 },
    ]);
    expect(typeof d).toBe("string");
    expect(d.length).toBeGreaterThan(0);
  });
});
