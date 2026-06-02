import React from "react";
import renderer, { act } from "react-test-renderer";

jest.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ScrollView: "ScrollView",
  StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
}));

const mockBack = jest.fn();
const mockUseLocalSearchParams = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

const mockSetOptions = jest.fn();
jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ setOptions: mockSetOptions }),
}));

const mockUseDailyEnergyCard = jest.fn();
jest.mock("@/lib/data/dash/useDailyEnergyCard", () => ({
  useDailyEnergyCard: (day: string) => mockUseDailyEnergyCard(day),
}));

import StrengthTodayHrDetailScreen, {
  STRENGTH_TODAY_HR_DETAIL_PATHNAME,
  STRENGTH_TODAY_HR_DETAIL_TITLE,
  STRENGTH_TODAY_HR_DETAIL_VALUE_HINT,
  STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE,
  buildStrengthTodayHrDetailRouteParams,
} from "../strength-today-hr-detail";

const DAY = "2026-03-12";

/**
 * Default thresholds (Phase B `default_thresholds_v1` from
 * `lib/integrations/appleHealth/resolveWorkoutHrZoneThresholds.ts`).
 * Each modal derives range labels from these — kept in sync here so tests fail
 * loudly if the constant drifts.
 */
const EXPECTED_RANGE_LABELS = [
  "<110 bpm",
  "110\u2013129 bpm",
  "130\u2013149 bpm",
  "150\u2013169 bpm",
  "170+ bpm",
] as const;

function energyWithHr(
  averageHeartRateBpm: number | undefined,
  opts: {
    heartRateZoneMinutes?: readonly [number, number, number, number, number];
    heartRateZoneBasis?: {
      modelVersion: "default_thresholds_v1";
      thresholdsBpm: readonly [number, number, number, number];
    };
  } = {},
) {
  const strength: Record<string, unknown> = {};
  if (averageHeartRateBpm != null) strength.averageHeartRateBpm = averageHeartRateBpm;
  if (opts.heartRateZoneMinutes != null) strength.heartRateZoneMinutes = opts.heartRateZoneMinutes;
  if (opts.heartRateZoneBasis != null) strength.heartRateZoneBasis = opts.heartRateZoneBasis;
  return {
    energy: {
      modelVersion: "vTest",
      computedAt: "2026-03-12T00:00:00.000Z",
      day: DAY,
      estimatedKcal: { low: 0, high: 0, midpoint: 0 },
      variancePct: 0,
      confidence: "moderate" as const,
      factors: {},
      missingRequiredInputs: [] as string[],
      energyInfluencers: {
        strength,
      },
    },
    loading: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("StrengthTodayHrDetailScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockSetOptions.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseDailyEnergyCard.mockReset();
  });

  it('renders avg HR as "{n} BPM" when influencer is present', async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    expect(mockUseDailyEnergyCard).toHaveBeenCalledWith(DAY);
    const value = tree!.root.findByProps({ testID: "strength-today-hr-detail-value" });
    expect(value.props.children).toBe("98 BPM");
    expect(value.props.accessibilityLabel).toBe("Average heart rate 98 BPM");
    const hint = tree!.root.findByProps({ testID: "strength-today-hr-detail-value-hint" });
    expect(hint.props.children).toBe(STRENGTH_TODAY_HR_DETAIL_VALUE_HINT);
    expect(mockBack).not.toHaveBeenCalled();
  });

  it('renders avg HR as "—" when influencer is missing', async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(undefined));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "strength-today-hr-detail-value" });
    expect(value.props.children).toBe("\u2014");
    expect(value.props.accessibilityLabel).toBe("Average heart rate not available");
  });

  it('renders avg HR as "—" when energy DTO is undefined (loading / error / signed-out)', async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue({
      energy: undefined,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "strength-today-hr-detail-value" });
    expect(value.props.children).toBe("\u2014");
  });

  it('renders Zones 1–5 as "—" rows + ranges + unavailable copy when no zones', async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    for (let i = 0; i < 5; i++) {
      const row = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}`,
      });
      expect(row.props.accessibilityLabel).toBe(
        `Zone ${i + 1}, not available, ${EXPECTED_RANGE_LABELS[i]}`,
      );
      const dur = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe("\u2014");
      const range = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}-range`,
      });
      expect(range.props.children).toBe(EXPECTED_RANGE_LABELS[i]);
    }
    const msg = tree!.root.findByProps({
      testID: "strength-today-hr-detail-zones-unavailable",
    });
    expect(msg.props.children).toBe(STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE);
  });

  it("sets the modal navigation title once mounted", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    await act(async () => {
      renderer.create(<StrengthTodayHrDetailScreen />);
    });
    expect(mockSetOptions).toHaveBeenCalledWith({ title: STRENGTH_TODAY_HR_DETAIL_TITLE });
  });

  it("closes when the day param is missing", async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    await act(async () => {
      renderer.create(<StrengthTodayHrDetailScreen />);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockUseDailyEnergyCard).not.toHaveBeenCalled();
  });

  it("closes when the day param is malformed", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "not-a-date" });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    await act(async () => {
      renderer.create(<StrengthTodayHrDetailScreen />);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("uses BPM (uppercase) in the modal hero — distinct from the card row's lowercase bpm", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "strength-today-hr-detail-value" });
    expect(value.props.children).toBe("98 BPM");
    expect(value.props.children).not.toBe("98 bpm");
  });
});

describe("StrengthTodayHrDetailScreen — daily-aggregate zone rendering", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockSetOptions.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseDailyEnergyCard.mockReset();
  });

  it("renders real per-zone m:ss durations when energyInfluencers.strength.heartRateZoneMinutes is present", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithHr(124, {
        heartRateZoneMinutes: [6.5, 14, 22, 8, 1.2] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    // 6.5 min → 6:30; 14 → 14:00; 22 → 22:00; 8 → 8:00; 1.2 → 1:12
    const expectedDurations = ["6:30", "14:00", "22:00", "8:00", "1:12"];
    for (let i = 0; i < 5; i++) {
      const dur = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe(expectedDurations[i]);
      const range = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}-range`,
      });
      expect(range.props.children).toBe(EXPECTED_RANGE_LABELS[i]);
      const row = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}`,
      });
      expect(row.props.accessibilityLabel).toBe(
        `Zone ${i + 1}, ${expectedDurations[i]}, ${EXPECTED_RANGE_LABELS[i]}`,
      );
    }
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-hr-detail-zones-unavailable" }),
    ).toHaveLength(0);
  });

  it("renders proportional progress-bar widths (max zone → 100%, others scale)", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithHr(124, {
        heartRateZoneMinutes: [10, 5, 2.5, 0, 0] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    // max = 10 → fillPercent computed against 10.
    const z1 = tree!.root.findByProps({ testID: "strength-today-hr-detail-zone-1-fill" });
    expect(z1.props.style).toContainEqual({ width: "100%" });
    const z2 = tree!.root.findByProps({ testID: "strength-today-hr-detail-zone-2-fill" });
    expect(z2.props.style).toContainEqual({ width: "50%" });
    const z3 = tree!.root.findByProps({ testID: "strength-today-hr-detail-zone-3-fill" });
    expect(z3.props.style).toContainEqual({ width: "25%" });
    // 0-min zones render NO fill (track only).
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-hr-detail-zone-4-fill" }),
    ).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-hr-detail-zone-5-fill" }),
    ).toHaveLength(0);
  });

  it("falls back to '—' rows + unavailable message when heartRateZoneMinutes absent", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(124));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    for (let i = 0; i < 5; i++) {
      const dur = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe("\u2014");
    }
    const msg = tree!.root.findByProps({
      testID: "strength-today-hr-detail-zones-unavailable",
    });
    expect(msg.props.children).toBe(STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE);
  });

  it("renders zero zone minutes as '0:00' (does not invent or hide)", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithHr(124, {
        heartRateZoneMinutes: [0, 0, 0, 0, 0] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    for (let i = 0; i < 5; i++) {
      const dur = tree!.root.findByProps({
        testID: `strength-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe("0:00");
    }
    expect(
      tree!.root.findAllByProps({ testID: "strength-today-hr-detail-zones-unavailable" }),
    ).toHaveLength(0);
  });
});

describe("StrengthTodayHrDetailScreen — session-level fallback (route param)", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockSetOptions.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseDailyEnergyCard.mockReset();
  });

  it("renders avg HR from session fallback when DailyFacts strength influencer is missing", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      day: DAY,
      fallbackAverageHeartRateBpm: "108",
    });
    mockUseDailyEnergyCard.mockReturnValue({ energy: undefined, loading: false, error: null, refetch: jest.fn() });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "strength-today-hr-detail-value" });
    expect(value.props.children).toBe("108 BPM");
  });

  it(
    "exact-bug repro: avg HR = 108 + session fallback [32.816, 1.183, 0, 0, 0] → renders real durations, NOT unavailable copy",
    async () => {
      mockUseLocalSearchParams.mockReturnValue({
        day: DAY,
        fallbackZoneMinutes: "32.816,1.183,0,0,0",
      });
      // Daily aggregate has only avg HR — zone payload absent (matches stale-DailyFacts case).
      mockUseDailyEnergyCard.mockReturnValue(energyWithHr(108));
      let tree!: renderer.ReactTestRenderer;
      await act(async () => {
        tree = renderer.create(<StrengthTodayHrDetailScreen />);
      });
      const value = tree!.root.findByProps({ testID: "strength-today-hr-detail-value" });
      expect(value.props.children).toBe("108 BPM");
      // 32.816 × 60 = 1968.96s → 32:49 (Apple-Fitness parity).
      // 1.183 × 60 = 70.98s → 1:11.
      const expectedDurations = ["32:49", "1:11", "0:00", "0:00", "0:00"];
      for (let i = 0; i < 5; i++) {
        const dur = tree!.root.findByProps({
          testID: `strength-today-hr-detail-zone-${i + 1}-duration`,
        });
        expect(dur.props.children).toBe(expectedDurations[i]);
      }
      // Critical: unavailable message MUST disappear when session fallback supplies zones.
      expect(
        tree!.root.findAllByProps({ testID: "strength-today-hr-detail-zones-unavailable" }),
      ).toHaveLength(0);
    },
  );

  it("daily aggregate wins when both are present (session fallback ignored)", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      day: DAY,
      fallbackZoneMinutes: "1,1,1,1,1",
    });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithHr(124, {
        heartRateZoneMinutes: [10, 0, 0, 0, 0] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    const dur1 = tree!.root.findByProps({
      testID: "strength-today-hr-detail-zone-1-duration",
    });
    expect(dur1.props.children).toBe("10:00");
    const dur2 = tree!.root.findByProps({
      testID: "strength-today-hr-detail-zone-2-duration",
    });
    expect(dur2.props.children).toBe("0:00");
  });

  it("malformed fallback param is ignored (zones unavailable)", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      day: DAY,
      fallbackZoneMinutes: "not,a,valid,tuple",
    });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(108));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    const msg = tree!.root.findByProps({
      testID: "strength-today-hr-detail-zones-unavailable",
    });
    expect(msg.props.children).toBe(STRENGTH_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE);
  });
});

describe("buildStrengthTodayHrDetailRouteParams + pathname", () => {
  it("returns the day verbatim when no fallback", () => {
    expect(buildStrengthTodayHrDetailRouteParams({ day: DAY })).toEqual({ day: DAY });
  });
  it("includes the fallback param when a valid tuple is provided", () => {
    expect(
      buildStrengthTodayHrDetailRouteParams({
        day: DAY,
        fallbackZoneMinutes: [32.816, 1.183, 0, 0, 0] as const,
      }),
    ).toEqual({ day: DAY, fallbackZoneMinutes: "32.816,1.183,0,0,0" });
  });
  it("includes fallbackAverageHeartRateBpm when provided", () => {
    expect(
      buildStrengthTodayHrDetailRouteParams({
        day: DAY,
        fallbackAverageHeartRateBpm: 108.4,
      }),
    ).toEqual({ day: DAY, fallbackAverageHeartRateBpm: "108.4" });
  });
  it("omits the fallback param when null/undefined", () => {
    expect(
      buildStrengthTodayHrDetailRouteParams({ day: DAY, fallbackZoneMinutes: null }),
    ).toEqual({ day: DAY });
  });
  it("pathname is the stable Expo Router path used by overview.tsx", () => {
    expect(STRENGTH_TODAY_HR_DETAIL_PATHNAME).toBe("/(app)/workouts/strength-today-hr-detail");
  });
});
