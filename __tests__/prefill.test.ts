import { encodePrefill, decodePrefill } from "../lib/logging/prefill";

describe("prefill encoder/decoder", () => {
  it("round-trips simple payloads", () => {
    const payload = { totals: { calories: 2250, protein: 180 } };
    const s = encodePrefill(payload);
    expect(typeof s).toBe("string");
    const decoded = decodePrefill(s);
    expect(decoded).toEqual(payload);
  });

  it("handles nested workout structures", () => {
    const payload = {
      exercises: [{ name: "Bench Press", sets: [{ reps: 8, weight: 185, rpe: 8 }] }],
    };
    const s = encodePrefill(payload);
    const decoded = decodePrefill(s);
    expect(decoded).toEqual(payload);
  });

  it("is defensive against bad inputs", () => {
    // missing/invalid strings should not throw and should return {}
    expect(decodePrefill("")).toEqual({});
    expect(decodePrefill("not-base64")).toEqual({});
    // valid base64, but not JSON: "this is not json"
    const bad = "dGhpcyBpcyBub3QganNvbg==";
    expect(decodePrefill(bad)).toEqual({});
  });
});
