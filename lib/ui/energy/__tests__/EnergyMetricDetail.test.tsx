import React from "react";
import renderer, { act } from "react-test-renderer";
import { describe, expect, it, jest, beforeEach } from "@jest/globals";
import { EnergyMetricDetail } from "@/lib/ui/energy/EnergyMetricDetail";
import type { DailyEnergyCardDto } from "@/lib/data/dash/useDailyEnergyCard";

const mockUseDailyEnergyCard = jest.fn();
const mockUseDailyFacts = jest.fn();

jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: (...args: unknown[]) => mockUseDailyEnergyCard(...args),
}));

jest.mock("@/lib/data/useDailyFacts", () => ({
  useDailyFacts: (...args: unknown[]) => mockUseDailyFacts(...args),
}));

jest.mock("react-native", () => ({
  ScrollView: "ScrollView",
  Text: "Text",
  View: "View",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

describe("EnergyMetricDetail", () => {
  beforeEach(() => {
    mockUseDailyEnergyCard.mockReset();
    mockUseDailyFacts.mockReset();
  });

  it("renders personalized BMR copy from mocked energy (no client math)", () => {
    const energy: DailyEnergyCardDto = {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-05T12:00:00.000Z",
      day: "2026-05-05",
      estimatedKcal: { low: 2200, high: 2600, midpoint: 2400 },
      variancePct: 0.08,
      confidence: "moderate",
      factors: {
        baseline: {
          kcalLow: 1517,
          kcalHigh: 1711,
          confidence: "high",
          inputsUsed: ["profile.dateOfBirth", "body.leanBodyMassKg"],
          inputsMissing: [],
        },
      },
      missingRequiredInputs: [],
    };
    mockUseDailyEnergyCard.mockReturnValue({ energy, loading: false, error: null });
    mockUseDailyFacts.mockReturnValue({ status: "ready", data: {} });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyMetricDetail dayKey="2026-05-05" variant="bmr" />);
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("+1,517–1,711 kcal");
    expect(text).toContain("Lean body mass");
    expect(text).toContain("tighter range");
  });

  it("renders cardio copy with duration from dailyFacts (display only)", () => {
    const energy: DailyEnergyCardDto = {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-05T12:00:00.000Z",
      day: "2026-05-05",
      estimatedKcal: { low: 2400, high: 2600, midpoint: 2500 },
      variancePct: 0.05,
      confidence: "high",
      factors: {
        cardio: {
          kcalLow: 177,
          kcalHigh: 283,
          inputsUsed: ["cardio.durationMinutes"],
          inputsMissing: [],
        },
      },
      missingRequiredInputs: [],
    };
    mockUseDailyEnergyCard.mockReturnValue({ energy, loading: false, error: null });
    mockUseDailyFacts.mockReturnValue({
      status: "ready",
      data: {
        cardio: { durationMinutes: 28, sessions: 1, distanceMeters: 4120, primarySport: "Running" },
        energyInfluencers: { cardio: { durationMinutes: 28, distanceMeters: 4120, sport: "Running" } },
      },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyMetricDetail dayKey="2026-05-05" variant="cardio" />);
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("28-minute");
    expect(text).toContain("+177–283 kcal");
    expect(text).toContain("2.56 mi");
    expect(text).toContain("Running");
    expect(text).toContain("Missing signals that would improve this");
  });

  it("renders strength session sport from dailyFacts (not cardio copy)", () => {
    const energy: DailyEnergyCardDto = {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-05T12:00:00.000Z",
      day: "2026-05-05",
      estimatedKcal: { low: 2400, high: 2600, midpoint: 2500 },
      variancePct: 0.05,
      confidence: "high",
      factors: {
        strength: {
          kcalLow: 210,
          kcalHigh: 360,
          inputsUsed: ["strength.durationMinutes", "body.weightKg"],
          inputsMissing: [],
        },
      },
      missingRequiredInputs: [],
    };
    mockUseDailyEnergyCard.mockReturnValue({ energy, loading: false, error: null });
    mockUseDailyFacts.mockReturnValue({
      status: "ready",
      data: {
        strength: {
          workoutsCount: 1,
          totalSets: 0,
          totalReps: 0,
          totalVolumeByUnit: {},
          durationMinutes: 52,
          primarySport: "TraditionalStrengthTraining",
        },
        energyInfluencers: {
          strength: { durationMinutes: 52, sets: 0, reps: 0, sport: "TraditionalStrengthTraining" },
        },
      },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyMetricDetail dayKey="2026-05-05" variant="strength" />);
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("TraditionalStrengthTraining");
    expect(text).toContain("52 min");
    expect(text).not.toContain("Planned cardio");
  });

  it("renders NEAT influencing metrics from energyInfluencers", () => {
    const energy: DailyEnergyCardDto = {
      modelVersion: "daily_energy_v3",
      computedAt: "2026-05-05T12:00:00.000Z",
      day: "2026-05-05",
      estimatedKcal: { low: 2400, high: 2600, midpoint: 2500 },
      variancePct: 0.05,
      confidence: "high",
      factors: {
        steps: {
          kcalLow: 390,
          kcalHigh: 528,
          inputsUsed: ["steps", "activity.distanceKm", "body.weightKg"],
          inputsMissing: [],
        },
      },
      missingRequiredInputs: [],
    };
    mockUseDailyEnergyCard.mockReturnValue({ energy, loading: false, error: null });
    mockUseDailyFacts.mockReturnValue({
      status: "ready",
      data: { energyInfluencers: { movement: { steps: 9954, distanceMeters: 7210 } } },
    });

    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<EnergyMetricDetail dayKey="2026-05-05" variant="neat" />);
    });
    const text = tree.root
      .findAllByType("Text")
      .flatMap((n) => n.children)
      .filter((c) => typeof c === "string")
      .join(" ");
    expect(text).toContain("9,954 steps");
    expect(text).toContain("7.21 km distance");
  });
});
