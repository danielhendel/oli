import { emptyAboutYouDraft } from "../onboardingDraftStorage";
import { validateAboutYouDraft } from "../aboutYouValidation";

function validBase() {
  return {
    ...emptyAboutYouDraft(),
    preferredName: "Alex",
    birthMonth: "5",
    birthDay: "12",
    birthYear: "1990",
    sexAtBirth: "male" as const,
    heightCm: "178",
  };
}

describe("validateAboutYouDraft", () => {
  it("requires preferred name, DOB, sex, and height", () => {
    const result = validateAboutYouDraft(emptyAboutYouDraft());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.preferredName).toBeTruthy();
    expect(result.errors.dateOfBirth).toBeTruthy();
    expect(result.errors.sexAtBirth).toBeTruthy();
    expect(result.errors.height).toBeTruthy();
  });

  it("rejects future DOB", () => {
    const draft = {
      ...validBase(),
      birthMonth: "1",
      birthDay: "1",
      birthYear: "2999",
      sexAtBirth: "female" as const,
      heightCm: "170",
    };
    const result = validateAboutYouDraft(draft);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.dateOfBirth).toMatch(/future/i);
  });

  it("accepts valid draft with optional blank weight", () => {
    const result = validateAboutYouDraft({ ...validBase(), weightValue: "" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.dateOfBirth).toBe("1990-05-12");
    expect(result.value.heightCm).toBe(178);
    expect(result.value.weightKg).toBeNull();
  });

  it("parses optional weight in lb", () => {
    const draft = {
      ...validBase(),
      sexAtBirth: "unspecified" as const,
      heightCm: "170",
      weightValue: "150",
      weightUnit: "lb" as const,
    };
    const result = validateAboutYouDraft(draft);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.weightKg).toBeGreaterThan(60);
    expect(result.value.weightKg).toBeLessThan(80);
  });
});
