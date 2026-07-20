import {
  resolveBodyCompositionMonitorPresence,
  resolveEnergyMonitorPresence,
  resolveNutritionMonitorPresence,
  resolveReadinessMonitorPresence,
  resolveSleepMonitorPresence,
} from "../resolveDailyMonitorDomainPresence";
import type { DailySleepCardViewModel } from "../dailySleepCardViewModel";
import type { DailyReadinessCardViewModel } from "@/lib/ui/dash/DailyReadinessCard";
import type { BuiltBodyCompositionDashCard } from "../buildBodyCompositionDashCardModel";

describe("resolveSleepMonitorPresence", () => {
  it("marks exact ready signal as present", () => {
    const vm = {
      status: "ready",
      day: "2026-07-20",
      isRefreshing: false,
      model: {
        day: "2026-07-20",
        headlineValueText: "90",
        durationValueText: "7h",
        scoreUnavailable: false,
        scoreUnavailableLabel: null,
        scoreValueText: "90",
        ratingLabel: "Optimal",
        ratingTone: "optimal",
        summarySentence: "ok",
        metricRows: [
          {
            id: "sleep_duration",
            label: "Duration",
            value: "7h",
            accessibilityValue: "7h",
            isAvailable: true,
            detail: { title: "Duration", value: "7h", body: "" },
          },
        ],
        hasAnySignal: true,
        emptyStateTitle: null,
        emptyStateSubtitle: null,
        lastNightSubtitle: "Last night’s sleep",
      },
    } as DailySleepCardViewModel;
    expect(resolveSleepMonitorPresence(vm)).toBe("present_complete");
  });

  it("marks missing / prior-night path as absent", () => {
    const vm = {
      status: "missing",
      day: "2026-07-20",
      message: "No sleep data logged for this day.",
      reason: "no_data",
    } as DailySleepCardViewModel;
    expect(resolveSleepMonitorPresence(vm)).toBe("absent_no_day_evidence");
  });

  it("marks oura disconnect without day data as unavailable_source", () => {
    const vm = {
      status: "missing",
      day: "2026-07-20",
      message: "Reconnect Oura",
      reason: "oura_disconnected",
      cta: { label: "Reconnect", href: "/(app)/settings/devices/oura" },
    } as DailySleepCardViewModel;
    expect(resolveSleepMonitorPresence(vm)).toBe("unavailable_source");
  });

  it("marks partial secondary metrics without converting missing to zero", () => {
    const vm = {
      status: "ready",
      day: "2026-07-20",
      isRefreshing: false,
      model: {
        day: "2026-07-20",
        headlineValueText: "88",
        durationValueText: "7h",
        scoreUnavailable: false,
        scoreUnavailableLabel: null,
        scoreValueText: "88",
        ratingLabel: "Optimal",
        ratingTone: "optimal",
        summarySentence: "ok",
        metricRows: [
          {
            id: "sleep_duration",
            label: "Duration",
            value: "7h",
            accessibilityValue: "7h",
            isAvailable: true,
            detail: { title: "Duration", value: "7h", body: "" },
          },
          {
            id: "efficiency",
            label: "Efficiency",
            value: "—",
            accessibilityValue: "Unavailable",
            isAvailable: false,
            detail: { title: "Efficiency", value: "—", body: "" },
          },
        ],
        hasAnySignal: true,
        emptyStateTitle: null,
        emptyStateSubtitle: null,
        lastNightSubtitle: "Last night’s sleep",
      },
    } as DailySleepCardViewModel;
    expect(resolveSleepMonitorPresence(vm)).toBe("present_partial");
  });

  it("marks unavailable score as present_partial without zeroing", () => {
    const vm = {
      status: "ready",
      day: "2026-07-20",
      isRefreshing: false,
      model: {
        day: "2026-07-20",
        headlineValueText: null,
        durationValueText: "7h",
        scoreUnavailable: true,
        scoreUnavailableLabel: "Sleep score unavailable",
        scoreValueText: null,
        ratingLabel: null,
        ratingTone: null,
        summarySentence: "ok",
        metricRows: [
          {
            id: "sleep_duration",
            label: "Duration",
            value: "7h",
            accessibilityValue: "7h",
            isAvailable: true,
            detail: { title: "Duration", value: "7h", body: "" },
          },
        ],
        hasAnySignal: true,
        emptyStateTitle: null,
        emptyStateSubtitle: null,
        lastNightSubtitle: "Last night’s sleep",
      },
    } as DailySleepCardViewModel;
    expect(resolveSleepMonitorPresence(vm)).toBe("present_partial");
  });
});

describe("resolveReadinessMonitorPresence", () => {
  it("marks fallback/missing as absent", () => {
    const vm = {
      status: "missing",
      day: "2026-07-20",
      message: "No current-day readiness",
    } as DailyReadinessCardViewModel;
    expect(resolveReadinessMonitorPresence(vm)).toBe("absent_no_day_evidence");
  });

  it("marks disconnect CTA without day data as unavailable_source", () => {
    const vm = {
      status: "missing",
      day: "2026-07-20",
      message: "Connect Oura",
      cta: { label: "Reconnect", href: "/(app)/settings/devices/oura" },
    } as DailyReadinessCardViewModel;
    expect(resolveReadinessMonitorPresence(vm)).toBe("unavailable_source");
  });

  it("marks exact current-day readiness as present", () => {
    const vm = {
      status: "ready",
      day: "2026-07-20",
      accessibilityLabel: "Readiness 82",
      model: {
        day: "2026-07-20",
        headlineValueText: "82",
        ratingLabel: "Good",
        summarySentence: "ok",
        sourceLabel: "Oura",
        hasAnySignal: true,
        emptyStateTitle: null,
        emptyStateSubtitle: null,
        metricRows: [
          {
            id: "hrv_balance",
            label: "HRV balance",
            value: "70",
            accessibilityValue: "70",
            isAvailable: true,
          },
        ],
      },
    } as DailyReadinessCardViewModel;
    expect(resolveReadinessMonitorPresence(vm)).toBe("present_complete");
  });
});

describe("resolveEnergyMonitorPresence", () => {
  it("requires energy.day to match requested day", () => {
    expect(
      resolveEnergyMonitorPresence({
        energy: {
          modelVersion: "v1",
          computedAt: "2026-07-19T12:00:00.000Z",
          day: "2026-07-19",
          estimatedKcal: { low: 1800, high: 2200, midpoint: 2000 },
          variancePct: 0.1,
          confidence: "moderate",
          factors: {},
          missingRequiredInputs: [],
        },
        loading: false,
        error: null,
        requestedDay: "2026-07-20",
      }),
    ).toBe("absent_no_day_evidence");
  });

  it("presents current-day energy", () => {
    expect(
      resolveEnergyMonitorPresence({
        energy: {
          modelVersion: "v1",
          computedAt: "2026-07-20T12:00:00.000Z",
          day: "2026-07-20",
          estimatedKcal: { low: 1800, high: 2200, midpoint: 2000 },
          variancePct: 0.1,
          confidence: "moderate",
          factors: {},
          missingRequiredInputs: [],
        },
        loading: false,
        error: null,
        requestedDay: "2026-07-20",
      }),
    ).toBe("present_complete");
  });

  it("treats absent energy as absent", () => {
    expect(
      resolveEnergyMonitorPresence({
        energy: undefined,
        loading: false,
        error: null,
        requestedDay: "2026-07-20",
      }),
    ).toBe("absent_no_day_evidence");
  });
});

describe("resolveNutritionMonitorPresence", () => {
  it("requires meaningful nutrition evidence", () => {
    expect(
      resolveNutritionMonitorPresence({
        model: {
          calorieLabel: "—",
          hasAnyNutrition: false,
          rows: [
            { key: "protein", label: "Protein", valueLabel: "—" },
            { key: "carbs", label: "Carbs", valueLabel: "—" },
            { key: "fat", label: "Fat", valueLabel: "—" },
          ],
        },
        loading: false,
        error: null,
      }),
    ).toBe("absent_no_day_evidence");
  });

  it("marks partial macros as present_partial", () => {
    expect(
      resolveNutritionMonitorPresence({
        model: {
          calorieLabel: "1,200 kcal",
          hasAnyNutrition: true,
          rows: [
            { key: "protein", label: "Protein", valueLabel: "80 g" },
            { key: "carbs", label: "Carbs", valueLabel: "—" },
            { key: "fat", label: "Fat", valueLabel: "40 g" },
          ],
        },
        loading: false,
        error: null,
      }),
    ).toBe("present_partial");
  });
});

describe("resolveBodyCompositionMonitorPresence — prior-day regression", () => {
  const readyBuilt = {
    tag: "ready",
    weightPrimaryLabel: "160 lb",
    readingAsOfLabel: "As of July 17th",
    rows: [
      {
        key: "bmi",
        label: "BMI",
        valueLabel: "22.0",
        bar: {
          marker01: 0.5,
          zone: "good",
          displayLabel: "Healthy",
          hasValue: true,
        },
        accessibilityLabel: "BMI",
      },
    ],
    cardAccessibilityLabel: "Body composition card.",
  } as BuiltBodyCompositionDashCard;

  it("hides Body Composition when latest observation is a prior day", () => {
    expect(
      resolveBodyCompositionMonitorPresence({
        requestedDay: "2026-07-20",
        overviewDay: "2026-07-17",
        seriesLoading: false,
        seriesError: null,
        hasUser: true,
        built: readyBuilt,
      }),
    ).toBe("absent_no_day_evidence");
  });

  it("shows Body Composition when observation day matches requested day", () => {
    expect(
      resolveBodyCompositionMonitorPresence({
        requestedDay: "2026-07-20",
        overviewDay: "2026-07-20",
        seriesLoading: false,
        seriesError: null,
        hasUser: true,
        built: {
          ...readyBuilt,
          readingAsOfLabel: "As of today",
        } as BuiltBodyCompositionDashCard,
      }),
    ).toBe("present_complete");
  });
});
