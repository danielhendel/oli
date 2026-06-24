// lib/data/health-assessment/__tests__/questionRegistry.test.ts
import {
  getAllQuestionIds,
  getQuestionById,
  getQuestionsForCategory,
  HEALTH_ASSESSMENT_QUESTIONS,
  validateQuestionRegistry,
} from "@/lib/data/health-assessment/questionRegistry";
import { ASSESSMENT_CATEGORIES } from "@/lib/data/health-assessment/types";

describe("health assessment question registry", () => {
  it("has all required categories", () => {
    for (const category of ASSESSMENT_CATEGORIES) {
      const questions = getQuestionsForCategory(category);
      expect(questions.length).toBeGreaterThan(0);
      expect(questions.every((q) => q.category === category)).toBe(true);
    }
  });

  it("has no invalid category or question IDs", () => {
    const errors = validateQuestionRegistry();
    expect(errors).toEqual([]);

    const ids = getAllQuestionIds();
    expect(new Set(ids).size).toBe(ids.length);

    for (const question of HEALTH_ASSESSMENT_QUESTIONS) {
      expect(ASSESSMENT_CATEGORIES).toContain(question.category);
      expect(question.id.length).toBeGreaterThan(0);
      expect(getQuestionById(question.id)).toBe(question);
    }
  });

  it("covers minimum identity and goals questions", () => {
    const identityIds = getQuestionsForCategory("identity").map((q) => q.id);
    expect(identityIds).toEqual(
      expect.arrayContaining([
        "identity-age",
        "identity-sex",
        "identity-height",
        "identity-weight",
        "identity-occupation-activity",
        "identity-life-constraints",
      ]),
    );

    const goalIds = getQuestionsForCategory("goals").map((q) => q.id);
    expect(goalIds).toEqual(
      expect.arrayContaining([
        "goals-primary",
        "goals-secondary",
        "goals-timeframe",
        "goals-motivation",
        "goals-focus",
      ]),
    );
  });
});
