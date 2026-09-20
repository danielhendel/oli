import {
  KELLY_LEAN_MASS_NUMERICAL_BLOCKER,
  KELLY_LEAN_MASS_NUMERICAL_RUNTIME_STATUS,
  KELLY_NHANES_TOTAL_LMI_STANDARD_CANDIDATE_ID,
  KELLY_NHANES_TOTAL_LMI_VERSION_CANDIDATE,
  KELLY_TABLE_S5_COLUMNS,
  KELLY_TABLE_S5_CONSTRUCT,
  KELLY_TABLE_S5_DOC_SHA256,
  KELLY_TABLE_S5_POOLED_ADULT_REFERENCE_AVAILABLE,
  KELLY_TABLE_S5_REFERENCE_POPULATIONS,
  KELLY_TABLE_S5_SUPPLEMENT_DOI,
  KELLY_TABLE_S5_VERIFIED_SAMPLE_ROWS,
} from "@/lib/body/standards/kellyNhanesTableS5Gate";

describe("Kelly NHANES Table S5 primary-source gate", () => {
  it("records bibliographic identity, checksum, and LMS column semantics", () => {
    expect(KELLY_NHANES_TOTAL_LMI_STANDARD_CANDIDATE_ID).toBe(
      "kelly-nhanes-hologic-total-lmi-reference",
    );
    expect(KELLY_NHANES_TOTAL_LMI_VERSION_CANDIDATE).toBe("2009.1");
    expect(KELLY_TABLE_S5_SUPPLEMENT_DOI).toBe("10.1371/journal.pone.0007038.s025");
    expect(KELLY_TABLE_S5_DOC_SHA256).toBe(
      "43371bbccbc42af900bbd15770470414c61bac2cead2ac13b16068d64debb718",
    );
    expect(KELLY_TABLE_S5_COLUMNS).toEqual(["Age", "M", "σ", "L"]);
    expect(KELLY_TABLE_S5_CONSTRUCT).toBe("total_lean_mass_index");
    expect(KELLY_TABLE_S5_REFERENCE_POPULATIONS).toEqual([
      "White",
      "Black",
      "Mexican American",
    ]);
  });

  it("verifies at least three extracted source rows", () => {
    expect(KELLY_TABLE_S5_VERIFIED_SAMPLE_ROWS).toHaveLength(3);
    expect(KELLY_TABLE_S5_VERIFIED_SAMPLE_ROWS[0]).toMatchObject({
      sex: "male",
      population: "White",
      age: 20,
      M: 18.98,
      sigma: 2.5,
      L: -1.115,
    });
    expect(KELLY_TABLE_S5_VERIFIED_SAMPLE_ROWS[1]).toMatchObject({
      sex: "female",
      population: "Black",
      age: 40,
      M: 18.12,
    });
    expect(KELLY_TABLE_S5_VERIFIED_SAMPLE_ROWS[2]).toMatchObject({
      population: "Mexican American",
      age: 60,
      M: 19.93,
    });
  });

  it("hard-stops numerical runtime — no pooled adult reference", () => {
    expect(KELLY_TABLE_S5_POOLED_ADULT_REFERENCE_AVAILABLE).toBe(false);
    expect(KELLY_LEAN_MASS_NUMERICAL_RUNTIME_STATUS).toBe(
      "BLOCKED_NO_APPROVED_NON_INFERRED_REFERENCE_POPULATION",
    );
    expect(KELLY_LEAN_MASS_NUMERICAL_BLOCKER).toMatch(/NO APPROVED NON-INFERRED REFERENCE POPULATION/);
  });
});
