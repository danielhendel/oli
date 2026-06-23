import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ weekStart: "2026-03-09" }),
  useNavigation: () => ({ setOptions: jest.fn(), goBack: jest.fn() }),
}));

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "u1" },
    getIdToken: jest.fn().mockResolvedValue("token"),
  }),
}));

import { buildHypertrophyStimulusWeekDetail } from "@/lib/workouts/exercises/intelligence/buildHypertrophyStimulusWeekDetail";
import { WeeklyHypertrophyStimulusDetailContent } from "@/lib/ui/workouts/WeeklyHypertrophyStimulusDetailContent";

import WeeklyMuscleStimulusScreen from "../muscle-stimulus";

function seededDetail() {
  return buildHypertrophyStimulusWeekDetail({
    weekStart: "2026-03-09",
    sessions: [
      {
        sessionId: "session-1",
        completedAt: "2026-03-10T12:00:00.000Z",
        sets: [
          { exerciseId: "bench_press", reps: 8, rpe: 8 },
          { exerciseId: "squat", reps: 5, rpe: 9 },
        ],
      },
    ],
  });
}

describe("WeeklyMuscleStimulusScreen", () => {
  it("renders the detail scroll container", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<WeeklyMuscleStimulusScreen />);
    });

    expect(tree.root.findAllByProps({ testID: "weekly-muscle-stimulus-scroll" }).length).toBeGreaterThan(0);
  });
});

describe("WeeklyHypertrophyStimulusDetailContent", () => {
  it("renders summary, regions, and exercise rows for seeded detail", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyHypertrophyStimulusDetailContent detail={seededDetail()} weekRangeLabel="Mar 9–15" />,
      );
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("Mar 9–15");
    expect(json).toContain("Summary");
    expect(json).toContain("Total stimulus");
    expect(json).toContain("Completed sessions");
    expect(json).toContain("Working sets");
    expect(json).toContain("Bench Press");
  });

  it("renders empty state when detail has no usable stimulus", async () => {
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(
        <WeeklyHypertrophyStimulusDetailContent
          detail={buildHypertrophyStimulusWeekDetail({ weekStart: "2026-03-09", sessions: [] })}
          weekRangeLabel="Mar 9–15"
        />,
      );
    });

    const json = JSON.stringify(tree.toJSON());
    expect(json).toContain("No muscle stimulus data for this week yet.");
  });
});
