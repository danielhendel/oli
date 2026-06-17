import { refreshNutritionDayAfterMutation } from "@/lib/data/nutrition/nutritionMutationRefresh";

const mockInvalidate = jest.fn();
const mockSchedule = jest.fn();

jest.mock("@/lib/data/dailyFactsSessionCache", () => ({
  invalidateDailyFactsSessionCache: (...args: unknown[]) => mockInvalidate(...args),
  scheduleDailyFactsInvalidationAfterIngest: (...args: unknown[]) => mockSchedule(...args),
}));

describe("refreshNutritionDayAfterMutation", () => {
  beforeEach(() => {
    mockInvalidate.mockClear();
    mockSchedule.mockClear();
  });

  it("invalidates cache and refetches facts/raw with cache bust", () => {
    const refetchFacts = jest.fn();
    const refetchRaw = jest.fn();
    refreshNutritionDayAfterMutation({
      userUid: "u1",
      dayKey: "2026-03-15",
      refetchFacts,
      refetchRaw,
    });
    expect(mockInvalidate).toHaveBeenCalledWith({ userUid: "u1", day: "2026-03-15" });
    expect(mockSchedule).toHaveBeenCalledWith({ userUid: "u1", day: "2026-03-15" });
    expect(refetchFacts).toHaveBeenCalledWith(expect.objectContaining({ cacheBust: expect.any(String) }));
    expect(refetchRaw).toHaveBeenCalledWith(expect.objectContaining({ cacheBust: expect.any(String) }));
  });
});
