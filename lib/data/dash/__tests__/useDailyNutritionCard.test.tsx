import React from "react";
import { act } from "react";
import renderer from "react-test-renderer";

import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useDailyNutritionCard } from "@/lib/data/dash/useDailyNutritionCard";

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: jest.fn(),
}));

const mockUseDailyFacts = useDailyFacts as jest.MockedFunction<typeof useDailyFacts>;

describe("useDailyNutritionCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns loading state consistent with Daily Energy pattern", () => {
    mockUseDailyFacts.mockReturnValue({
      status: "partial",
      refetch: jest.fn(),
    });

    let latest: ReturnType<typeof useDailyNutritionCard> | null = null;

    function Harness() {
      latest = useDailyNutritionCard("2026-05-08");
      return null;
    }

    act(() => {
      renderer.create(<Harness />);
    });

    expect(latest).not.toBeNull();
    expect(latest?.loading).toBe(true);
    expect(latest?.error).toBeNull();
    expect(latest?.model.calorieLabel).toBe("—");
  });
});
