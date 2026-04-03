import { describe, expect, it } from "@jest/globals";
import {
  interpretationZoneDisplayLabel,
  interpretationZoneFromMarker01,
} from "../bodyOverviewInterpretationBar";

describe("bodyOverviewInterpretationBar", () => {
  it("maps marker01 to quality zones at quarter boundaries", () => {
    expect(interpretationZoneFromMarker01(0)).toBe("out_of_range");
    expect(interpretationZoneFromMarker01(0.24)).toBe("out_of_range");
    expect(interpretationZoneFromMarker01(0.25)).toBe("fair");
    expect(interpretationZoneFromMarker01(0.49)).toBe("fair");
    expect(interpretationZoneFromMarker01(0.5)).toBe("good");
    expect(interpretationZoneFromMarker01(0.74)).toBe("good");
    expect(interpretationZoneFromMarker01(0.75)).toBe("optimal");
    expect(interpretationZoneFromMarker01(1)).toBe("optimal");
  });

  it("interpretationZoneDisplayLabel returns compact UI strings", () => {
    expect(interpretationZoneDisplayLabel("out_of_range")).toBe("Out of range");
    expect(interpretationZoneDisplayLabel("fair")).toBe("Fair");
    expect(interpretationZoneDisplayLabel("good")).toBe("Good");
    expect(interpretationZoneDisplayLabel("optimal")).toBe("Optimal");
  });
});
