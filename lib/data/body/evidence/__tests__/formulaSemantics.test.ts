/**
 * Formula semantic boundaries — prove no silent metric substitution.
 */
import { describe, expect, it } from "@jest/globals";

import {
  calculateAlmiObservation,
  calculateFfmiObservation,
  calculateFmiObservation,
  calculateWhtrObservation,
} from "../formulas";

describe("formula semantic boundaries", () => {
  it("FFMI requires fat-free mass — lean mass is a different metric (caller responsibility)", () => {
    // Helper has no leanMassKg parameter; substituting lean would be a compile-time/API error.
    const r = calculateFfmiObservation({
      fatFreeMassKg: 55,
      heightCm: 175,
      measuredAt: "2026-01-01T00:00:00.000Z",
      inputObservationRefs: ["ffm", "h"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.observation.metricKey).toBe("ffmi");
      expect(r.observation.provenance.inputObservationRefs).toEqual(["ffm", "h"]);
    }
  });

  it("ALMI requires appendicular lean — not total lean", () => {
    const r = calculateAlmiObservation({
      appendicularLeanMassKg: 22,
      heightCm: 175,
      measuredAt: "2026-01-01T00:00:00.000Z",
      inputObservationRefs: ["alm", "h"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.observation.metricKey).toBe("almi");
  });

  it("WHtR requires waist length — VAT volume cannot be passed as waistCm without caller error", () => {
    // API surface is waistCm only; VAT cm³ would produce nonsense if misused — caller must not.
    const r = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 175,
      measuredAt: "2026-03-04T08:00:00.000Z",
      inputObservationRefs: ["waist", "height"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.observation.metricKey).toBe("whtr");
      expect(r.observation.canonicalUnit).toBe("ratio");
      // No classification / threshold fields on observation
      expect((r.observation as { status?: unknown }).status).toBeUndefined();
      expect((r.observation as { risk?: unknown }).risk).toBeUndefined();
    }
  });

  it("FMI requires fat mass kg — not body fat percent", () => {
    const r = calculateFmiObservation({
      fatMassKg: 14,
      heightCm: 175,
      measuredAt: "2026-01-01T00:00:00.000Z",
      inputObservationRefs: ["fm", "h"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.observation.metricKey).toBe("fmi");
    // Passing BF% (e.g. 18.5) as fatMassKg would be caller misuse — helper does not convert %.
    const misuse = calculateFmiObservation({
      fatMassKg: 18.5,
      heightCm: 175,
      measuredAt: "2026-01-01T00:00:00.000Z",
      inputObservationRefs: ["bfpct_misuse", "h"],
    });
    expect(misuse.ok).toBe(true);
    if (misuse.ok) {
      // Proves no automatic %→kg conversion: value treats 18.5 as kg.
      expect(misuse.observation.value).toBeCloseTo(18.5 / (1.75 * 1.75), 5);
    }
  });

  it("does not claim cross-source compatibility", () => {
    const r = calculateWhtrObservation({
      waistCm: 80,
      heightCm: 175,
      measuredAt: "2026-03-04T08:00:00.000Z",
      inputObservationRefs: ["manual_waist", "profile_height"],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect((r.observation as { inputsCompatible?: unknown }).inputsCompatible).toBeUndefined();
      expect((r.observation as { sourceRank?: unknown }).sourceRank).toBeUndefined();
    }
  });
});
