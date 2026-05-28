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

function energyWithHr(averageHeartRateBpm: number | undefined) {
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
        strength:
          averageHeartRateBpm != null ? { averageHeartRateBpm } : ({} as Record<string, never>),
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

  it("renders Zones 1–5 as placeholders plus the graceful unavailable message", async () => {
    mockUseLocalSearchParams.mockReturnValue({ day: DAY });
    mockUseDailyEnergyCard.mockReturnValue(energyWithHr(98));
    let tree!: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<StrengthTodayHrDetailScreen />);
    });
    for (const z of [1, 2, 3, 4, 5]) {
      const row = tree!.root.findByProps({ testID: `strength-today-hr-detail-zone-${z}` });
      expect(row.props.accessibilityLabel).toBe(`Zone ${z}, not available`);
      const rowJson = JSON.stringify(tree!.toJSON());
      expect(rowJson).toContain(`Zone ${z}`);
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
    // Did not query useDailyEnergyCard with an invalid day.
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

describe("buildStrengthTodayHrDetailRouteParams + pathname", () => {
  it("returns the day verbatim", () => {
    expect(buildStrengthTodayHrDetailRouteParams({ day: DAY })).toEqual({ day: DAY });
  });
  it("pathname is the stable Expo Router path used by overview.tsx", () => {
    expect(STRENGTH_TODAY_HR_DETAIL_PATHNAME).toBe("/(app)/workouts/strength-today-hr-detail");
  });
});
