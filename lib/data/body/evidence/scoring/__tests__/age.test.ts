/**
 * Adult age gate — UTC completed years and leap-day rules.
 */
import { describe, expect, it } from "@jest/globals";

import { adultAgeOk, completedUtcYears, parseDobUtc } from "../age";
import { scoreHealthFromBundle } from "../testFixtures";
import { healthReadyBundle } from "../testFixtures";
import { AS_OF } from "../../resolver/testFixtures";

const AS_OF_MS = Date.parse(AS_OF);

describe("completedUtcYears / adultAgeOk", () => {
  it("withholds day before 20th birthday, passes exact 20th and day after", () => {
    const dob = "2006-06-02";
    expect(adultAgeOk(dob, Date.parse("2026-06-01T12:00:00.000Z"))).toBe(false);
    expect(adultAgeOk(dob, Date.parse("2026-06-02T00:00:00.000Z"))).toBe(true);
    expect(adultAgeOk(dob, Date.parse("2026-06-03T00:00:00.000Z"))).toBe(true);
  });

  it("Feb 29 DOB on Feb 28 non-leap year → 24 completed years (still under 20 gate at 2025-02-28)", () => {
    expect(completedUtcYears("2000-02-29", Date.parse("2025-02-28T00:00:00.000Z"))).toBe(24);
    expect(adultAgeOk("2000-02-29", Date.parse("2025-02-28T00:00:00.000Z"))).toBe(true);
  });

  it("Feb 29 DOB on Mar 1 non-leap year → 25 completed years", () => {
    expect(completedUtcYears("2000-02-29", Date.parse("2025-03-01T00:00:00.000Z"))).toBe(25);
  });

  it("Feb 29 2004 DOB: 2024-02-28 withholds; 2024-02-29 eligible", () => {
    const dob = "2004-02-29";
    expect(adultAgeOk(dob, Date.parse("2024-02-28T00:00:00.000Z"))).toBe(false);
    expect(adultAgeOk(dob, Date.parse("2024-02-29T00:00:00.000Z"))).toBe(true);
  });
});

describe("age gate via scoreHealthFromBundle", () => {
  it("maps missing/malformed/impossible DOB and DOB after asOf to required_age_missing", () => {
    for (const dateOfBirth of [
      null,
      "",
      "not-a-date",
      "2020-13-01",
      "2020-02-30",
      "2021-02-29",
      "2030-01-01",
    ]) {
      const bundle = healthReadyBundle({ dateOfBirth });
      const result = scoreHealthFromBundle(bundle);
      expect(result.primaryReason).toBe("required_age_missing");
      expect(result.constructScores.H1.primaryReason).toBe("required_age_missing");
    }
  });

  it("never emits invalid_provenance for DOB failures", () => {
    const bundle = healthReadyBundle({ dateOfBirth: "2020-01-01" });
    const result = scoreHealthFromBundle(bundle);
    expect(result.primaryReason).toBe("required_age_missing");
    expect(result.primaryReason).not.toBe("invalid_provenance");
    expect(parseDobUtc("2021-02-29")).toBeNull();
    expect(completedUtcYears("1990-01-01", AS_OF_MS)).toBeGreaterThanOrEqual(20);
  });
});
