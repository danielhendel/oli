import { normalizeBodyScanType } from "../normalizeBodyScanType";

describe("normalizeBodyScanType", () => {
  it("passes through governed enum values", () => {
    expect(normalizeBodyScanType("dxa")).toBe("dxa");
    expect(normalizeBodyScanType("inbody")).toBe("inbody");
    expect(normalizeBodyScanType("evolt")).toBe("evolt");
    expect(normalizeBodyScanType("bod_pod")).toBe("bod_pod");
    expect(normalizeBodyScanType("other")).toBe("other");
  });

  it("maps evidence-backed aliases only", () => {
    expect(normalizeBodyScanType("dexa")).toBe("dxa");
    expect(normalizeBodyScanType("DEXA")).toBe("dxa");
    expect(normalizeBodyScanType("bodpod")).toBe("bod_pod");
  });

  it("does not invent unsupported aliases", () => {
    // No repository evidence for these as stored scanType values.
    expect(normalizeBodyScanType("in_body")).toBe("other");
    expect(normalizeBodyScanType("evolt_active")).toBe("other");
  });

  it("maps unknown / empty / non-string to other", () => {
    expect(normalizeBodyScanType("quest_lab")).toBe("other");
    expect(normalizeBodyScanType("")).toBe("other");
    expect(normalizeBodyScanType(null)).toBe("other");
    expect(normalizeBodyScanType(undefined)).toBe("other");
    expect(normalizeBodyScanType(12)).toBe("other");
  });
});
