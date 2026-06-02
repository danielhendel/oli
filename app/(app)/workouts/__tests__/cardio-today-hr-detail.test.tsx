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

import CardioTodayHrDetailScreen, {
  CARDIO_TODAY_HR_DETAIL_PATHNAME,
  CARDIO_TODAY_HR_DETAIL_TITLE,
  CARDIO_TODAY_HR_DETAIL_VALUE_HINT,
  CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE,
  buildCardioTodayHrDetailRouteParams,
  formatCardioTodayZoneMinutesValue,
} from "../cardio-today-hr-detail";

const DAY = "2026-03-12";

const EXPECTED_RANGE_LABELS = [
  "<110 bpm",
  "110\u2013129 bpm",
  "130\u2013149 bpm",
  "150\u2013169 bpm",
  "170+ bpm",
] as const;

function energyWithCardio(opts: {
  averageHeartRateBpm?: number;
  heartRateZoneMinutes?: readonly [number, number, number, number, number];
  heartRateZoneBasis?: {
    modelVersion: "default_thresholds_v1";
    thresholdsBpm: readonly [number, number, number, number];
  };
} = {}) {
  const cardio: Record<string, unknown> = {};
  if (opts.averageHeartRateBpm != null) cardio.averageHeartRateBpm = opts.averageHeartRateBpm;
  if (opts.heartRateZoneMinutes != null) cardio.heartRateZoneMinutes = opts.heartRateZoneMinutes;
  if (opts.heartRateZoneBasis != null) cardio.heartRateZoneBasis = opts.heartRateZoneBasis;
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
      energyInfluencers: { cardio },
    },
    loading: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("formatCardioTodayZoneMinutesValue (legacy formatter — still exported for callers)", () => {
  it("returns '0 min' for zero", () => {
    expect(formatCardioTodayZoneMinutesValue(0)).toBe("0 min");
  });
  it("rounds to one decimal", () => {
    expect(formatCardioTodayZoneMinutesValue(6.49)).toBe("6.5 min");
    expect(formatCardioTodayZoneMinutesValue(14)).toBe("14 min");
  });
  it("returns '—' for missing / non-finite / negative", () => {
    expect(formatCardioTodayZoneMinutesValue(null)).toBe("\u2014");
    expect(formatCardioTodayZoneMinutesValue(undefined)).toBe("\u2014");
    expect(formatCardioTodayZoneMinutesValue(Number.NaN)).toBe("\u2014");
    expect(formatCardioTodayZoneMinutesValue(-1)).toBe("\u2014");
  });
});

describe("CardioTodayHrDetailScreen", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockSetOptions.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseDailyEnergyCard.mockReset();
  });

  it("renders avg HR + real m:ss zone durations when both are present", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithCardio({
        averageHeartRateBpm: 142,
        heartRateZoneMinutes: [3, 8, 18, 4, 1] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    expect(mockUseDailyEnergyCard).toHaveBeenCalledWith(DAY);
    const value = tree!.root.findByProps({ testID: "cardio-today-hr-detail-value" });
    expect(value.props.children).toBe("142 BPM");
    const hint = tree!.root.findByProps({ testID: "cardio-today-hr-detail-value-hint" });
    expect(hint.props.children).toBe(CARDIO_TODAY_HR_DETAIL_VALUE_HINT);
    const expectedDurations = ["3:00", "8:00", "18:00", "4:00", "1:00"];
    for (let i = 0; i < 5; i++) {
      const dur = tree!.root.findByProps({
        testID: `cardio-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe(expectedDurations[i]);
      const range = tree!.root.findByProps({
        testID: `cardio-today-hr-detail-zone-${i + 1}-range`,
      });
      expect(range.props.children).toBe(EXPECTED_RANGE_LABELS[i]);
      const row = tree!.root.findByProps({
        testID: `cardio-today-hr-detail-zone-${i + 1}`,
      });
      expect(row.props.accessibilityLabel).toBe(
        `Zone ${i + 1}, ${expectedDurations[i]}, ${EXPECTED_RANGE_LABELS[i]}`,
      );
    }
    expect(
      tree!.root.findAllByProps({ testID: "cardio-today-hr-detail-zones-unavailable" }),
    ).toHaveLength(0);
  });

  it("renders avg HR + zones-unavailable copy when only avg HR is present", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithCardio({ averageHeartRateBpm: 142 }));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "cardio-today-hr-detail-value" });
    expect(value.props.children).toBe("142 BPM");
    for (let i = 0; i < 5; i++) {
      const row = tree!.root.findByProps({
        testID: `cardio-today-hr-detail-zone-${i + 1}`,
      });
      expect(row.props.accessibilityLabel).toBe(
        `Zone ${i + 1}, not available, ${EXPECTED_RANGE_LABELS[i]}`,
      );
    }
    const msg = tree!.root.findByProps({
      testID: "cardio-today-hr-detail-zones-unavailable",
    });
    expect(msg.props.children).toBe(CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE);
  });

  it("renders zones when only zones are present (avg HR shows '—', zones still real)", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithCardio({
        heartRateZoneMinutes: [1, 2, 3, 4, 5] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "cardio-today-hr-detail-value" });
    expect(value.props.children).toBe("\u2014");
    const expectedDurations = ["1:00", "2:00", "3:00", "4:00", "5:00"];
    for (let i = 0; i < 5; i++) {
      const dur = tree!.root.findByProps({
        testID: `cardio-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe(expectedDurations[i]);
    }
  });

  it('renders "—" + zones-unavailable when energyInfluencers.cardio is empty', async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithCardio());
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "cardio-today-hr-detail-value" });
    expect(value.props.children).toBe("\u2014");
    expect(
      tree!.root.findByProps({ testID: "cardio-today-hr-detail-zones-unavailable" }).props.children,
    ).toBe(CARDIO_TODAY_HR_DETAIL_ZONES_UNAVAILABLE_MESSAGE);
  });

  it("renders '—' when energy DTO is undefined (loading / error / signed-out)", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue({
      energy: undefined,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    const value = tree!.root.findByProps({ testID: "cardio-today-hr-detail-value" });
    expect(value.props.children).toBe("\u2014");
  });

  it("renders proportional progress-bar widths for cardio zones", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithCardio({
        averageHeartRateBpm: 142,
        heartRateZoneMinutes: [0, 0, 20, 10, 5] as const,
        heartRateZoneBasis: {
          modelVersion: "default_thresholds_v1",
          thresholdsBpm: [110, 130, 150, 170] as const,
        },
      }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    const z3 = tree!.root.findByProps({ testID: "cardio-today-hr-detail-zone-3-fill" });
    expect(z3.props.style).toContainEqual({ width: "100%" });
    const z4 = tree!.root.findByProps({ testID: "cardio-today-hr-detail-zone-4-fill" });
    expect(z4.props.style).toContainEqual({ width: "50%" });
    const z5 = tree!.root.findByProps({ testID: "cardio-today-hr-detail-zone-5-fill" });
    expect(z5.props.style).toContainEqual({ width: "25%" });
    // 0-min zones render no fill.
    expect(
      tree!.root.findAllByProps({ testID: "cardio-today-hr-detail-zone-1-fill" }),
    ).toHaveLength(0);
    expect(
      tree!.root.findAllByProps({ testID: "cardio-today-hr-detail-zone-2-fill" }),
    ).toHaveLength(0);
  });

  it("sets the modal navigation title once mounted", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithCardio({ averageHeartRateBpm: 142 }));
    await act(async () => {
      renderer.create(<CardioTodayHrDetailScreen />);
    });
    expect(mockSetOptions).toHaveBeenCalledWith({ title: CARDIO_TODAY_HR_DETAIL_TITLE });
  });

  it("closes when the day param is missing", async () => {
    mockUseLocalSearchParams.mockReturnValue({});
    mockUseDailyEnergyCard.mockReturnValue(energyWithCardio({ averageHeartRateBpm: 142 }));
    await act(async () => {
      renderer.create(<CardioTodayHrDetailScreen />);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockUseDailyEnergyCard).not.toHaveBeenCalled();
  });

  it("closes when the day param is malformed", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: "not-a-date" });
    mockUseDailyEnergyCard.mockReturnValue(energyWithCardio({ averageHeartRateBpm: 142 }));
    await act(async () => {
      renderer.create(<CardioTodayHrDetailScreen />);
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});

describe("CardioTodayHrDetailScreen — session-level fallback (route param)", () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockSetOptions.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseDailyEnergyCard.mockReset();
  });

  it("uses session-level fallback when daily aggregate zones are missing", async () => {
    mockUseLocalSearchParams.mockReturnValue({
      day: DAY,
      fallbackZoneMinutes: "10,20,5,2,0.5",
    });
    mockUseDailyEnergyCard.mockReturnValue(
      energyWithCardio({ averageHeartRateBpm: 142 }),
    );
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<CardioTodayHrDetailScreen />);
    });
    const expectedDurations = ["10:00", "20:00", "5:00", "2:00", "0:30"];
    for (let i = 0; i < 5; i++) {
      const dur = tree!.root.findByProps({
        testID: `cardio-today-hr-detail-zone-${i + 1}-duration`,
      });
      expect(dur.props.children).toBe(expectedDurations[i]);
    }
    expect(
      tree!.root.findAllByProps({ testID: "cardio-today-hr-detail-zones-unavailable" }),
    ).toHaveLength(0);
  });
});

describe("buildCardioTodayHrDetailRouteParams + pathname", () => {
  it("returns the day verbatim when no fallback", () => {
    expect(buildCardioTodayHrDetailRouteParams({ day: DAY })).toEqual({ day: DAY });
  });
  it("includes the fallback param when a valid tuple is provided", () => {
    expect(
      buildCardioTodayHrDetailRouteParams({
        day: DAY,
        fallbackZoneMinutes: [10, 20, 5, 2, 0.5] as const,
      }),
    ).toEqual({ day: DAY, fallbackZoneMinutes: "10,20,5,2,0.5" });
  });
  it("omits the fallback param when null", () => {
    expect(
      buildCardioTodayHrDetailRouteParams({ day: DAY, fallbackZoneMinutes: null }),
    ).toEqual({ day: DAY });
  });
  it("pathname is the stable Expo Router path used by overview.tsx", () => {
    expect(CARDIO_TODAY_HR_DETAIL_PATHNAME).toBe("/(app)/workouts/cardio-today-hr-detail");
  });
});
