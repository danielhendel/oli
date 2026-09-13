import {
  splitCanonicalDateOfBirth,
  validateDateOfBirthParts,
  sanitizeDobPartInput,
} from "../dateOfBirthParts";

describe("dateOfBirthParts", () => {
  it("accepts an ordinary valid date and emits YYYY-MM-DD", () => {
    const r = validateDateOfBirthParts({ month: "5", day: "12", year: "1990" });
    expect(r).toEqual({ ok: true, iso: "1990-05-12", month: 5, day: 12, year: 1990 });
  });

  it("accepts February 28", () => {
    expect(validateDateOfBirthParts({ month: "2", day: "28", year: "1990" }).ok).toBe(true);
  });

  it("accepts leap-year February 29", () => {
    const r = validateDateOfBirthParts({ month: "2", day: "29", year: "2000" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.iso).toBe("2000-02-29");
  });

  it("rejects non-leap February 29", () => {
    const r = validateDateOfBirthParts({ month: "2", day: "29", year: "1999" });
    expect(r.ok).toBe(false);
  });

  it("rejects April 31", () => {
    expect(validateDateOfBirthParts({ month: "4", day: "31", year: "1990" }).ok).toBe(false);
  });

  it("rejects month 13", () => {
    expect(validateDateOfBirthParts({ month: "13", day: "1", year: "1990" }).ok).toBe(false);
  });

  it("rejects day 0", () => {
    expect(validateDateOfBirthParts({ month: "1", day: "0", year: "1990" }).ok).toBe(false);
  });

  it("rejects incomplete dates", () => {
    expect(validateDateOfBirthParts({ month: "1", day: "", year: "1990" }).ok).toBe(false);
    expect(validateDateOfBirthParts({ month: "", day: "1", year: "1990" }).ok).toBe(false);
    expect(validateDateOfBirthParts({ month: "1", day: "1", year: "90" }).ok).toBe(false);
  });

  it("rejects future dates", () => {
    const r = validateDateOfBirthParts({ month: "1", day: "1", year: "2999" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/future/i);
  });

  it("splits canonical DOB without timezone shift", () => {
    expect(splitCanonicalDateOfBirth("1990-05-12")).toEqual({
      year: "1990",
      month: "5",
      day: "12",
    });
    expect(splitCanonicalDateOfBirth("1990-05-12T00:00:00.000Z")).toBeNull();
  });

  it("sanitizes digit input lengths", () => {
    expect(sanitizeDobPartInput("month", "13a")).toBe("13");
    expect(sanitizeDobPartInput("day", "991")).toBe("99");
    expect(sanitizeDobPartInput("year", "19999")).toBe("1999");
  });
});
