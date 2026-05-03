import React from "react";
import renderer, { act } from "react-test-renderer";

import { buildCardioMonthlyMilesAnalyticsModel } from "@/lib/data/workouts/cardioMonthlyMilesAnalyticsModel";
import { WORKOUT_OVERVIEW_ANALYTICS_YEAR } from "@/lib/data/workouts/workoutsCalendarModel";

const mockUseCardioAnalyticsDetailScreenData = jest.fn();

jest.mock("@/lib/hooks/useCardioAnalyticsDetailScreenData", () => ({
  useCardioAnalyticsDetailScreenData: () => mockUseCardioAnalyticsDetailScreenData(),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "u1" }, initializing: false }),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

import CardioAnalyticsDetailScreen from "../analytics-detail";

describe("CardioAnalyticsDetailScreen", () => {
  beforeEach(() => {
    mockUseCardioAnalyticsDetailScreenData.mockReturnValue({
      model: buildCardioMonthlyMilesAnalyticsModel({
        cardioCalendarDays: [],
        analyticsYear: WORKOUT_OVERVIEW_ANALYTICS_YEAR,
        todayDayKey: "2026-05-02",
      }),
      calendarReady: true,
    });
  });

  it("renders yearly cardio miles chart instead of placeholder", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioAnalyticsDetailScreen />);
    });
    const str = JSON.stringify(tree.toJSON());
    expect(str).not.toContain("More analytics soon");
    expect(str).toContain("2026 Cardio Miles");
    expect(str).toContain("cardio-miles-analytics-card");
    expect(str).toContain("cardio-analytics-detail-scroll");
  });
});
