import {
  BODY_HISTORY_METRIC_TITLES,
  bodyHistoryCalendarAccessibilityLabel,
  bodyHistoryCalendarHref,
  bodyHistoryListAccessibilityLabel,
  bodyHistoryListHref,
  bodyHistoryMetricFromDetailParam,
  bodyMetricDetailBackAccessibilityLabel,
  parseBodyHistoryMetricParam,
} from "@/lib/data/body/bodyHistoryMetricFilter";
import {
  buildBodyCompositionLogEntries,
  buildBodyCompositionLogRowVm,
  filterBodyCompositionLogEntriesForMetric,
} from "@/lib/data/body/bodyCompositionLogEntries";
import type { RawEventListItem } from "@oli/contracts";

describe("bodyHistoryMetricFilter", () => {
  it("parses metric query aliases and defaults to weight", () => {
    expect(parseBodyHistoryMetricParam(undefined)).toBe("weight");
    expect(parseBodyHistoryMetricParam("body-fat")).toBe("bodyFat");
    expect(parseBodyHistoryMetricParam("lean-mass")).toBe("leanTissue");
    expect(parseBodyHistoryMetricParam("nope")).toBe("weight");
  });

  it("maps detail route params and builds metric-specific hrefs/labels", () => {
    expect(bodyHistoryMetricFromDetailParam("weight")).toBe("weight");
    expect(bodyHistoryMetricFromDetailParam("body-fat")).toBe("bodyFat");
    expect(bodyHistoryMetricFromDetailParam("lean-mass")).toBe("leanTissue");
    expect(bodyHistoryMetricFromDetailParam("bmi")).toBeNull();
    expect(bodyHistoryCalendarHref("bodyFat")).toBe("/(app)/body/calendar?metric=bodyFat");
    expect(bodyHistoryListHref("leanTissue")).toBe("/(app)/body/list?metric=leanTissue");
    expect(bodyHistoryCalendarAccessibilityLabel("weight")).toBe("Open Weight calendar");
    expect(bodyHistoryListAccessibilityLabel("bodyFat")).toBe("Open Body Fat history");
    expect(bodyMetricDetailBackAccessibilityLabel()).toBe("Back to Body Composition");
    expect(BODY_HISTORY_METRIC_TITLES.leanTissue).toBe("Lean Mass");
  });
});

describe("filterBodyCompositionLogEntriesForMetric", () => {
  const weightItem = (overrides: Partial<RawEventListItem> = {}): RawEventListItem => ({
    id: "w1",
    userId: "u1",
    sourceId: "manual",
    kind: "weight",
    observedAt: "2026-06-06T14:30:00.000Z",
    receivedAt: "2026-06-06T14:30:01.000Z",
    schemaVersion: 1,
    payload: {
      time: "2026-06-06T14:30:00.000Z",
      timezone: "America/New_York",
      weightKg: 72.8,
      bodyFatPercent: 18.2,
    },
    ...overrides,
  });

  const leanItem = (): RawEventListItem => ({
    id: "c1",
    userId: "u1",
    sourceId: "apple_health",
    kind: "body_composition",
    observedAt: "2026-06-07T14:30:00.000Z",
    receivedAt: "2026-06-07T14:30:01.000Z",
    schemaVersion: 1,
    payload: {
      time: "2026-06-07T14:30:00.000Z",
      timezone: "America/New_York",
      leanBodyMassKg: 60.5,
    },
  });

  it("never falls back to another metric when filtering history", () => {
    const entries = buildBodyCompositionLogEntries(
      [weightItem(), leanItem(), weightItem({ id: "w2", payload: { time: "2026-06-08T14:30:00.000Z", timezone: "America/New_York", weightKg: 73 } })],
      "America/New_York",
    );
    const weightOnly = filterBodyCompositionLogEntriesForMetric(entries, "weight");
    const fatOnly = filterBodyCompositionLogEntriesForMetric(entries, "bodyFat");
    const leanOnly = filterBodyCompositionLogEntriesForMetric(entries, "leanTissue");
    expect(weightOnly).toHaveLength(2);
    expect(fatOnly).toHaveLength(1);
    expect(leanOnly).toHaveLength(1);
    expect(buildBodyCompositionLogRowVm(fatOnly[0]!, "lb", "bodyFat").primaryMetric).toMatch(
      /Body Fat 18\.2%/,
    );
    expect(buildBodyCompositionLogRowVm(leanOnly[0]!, "lb", "leanTissue").primaryMetric).toMatch(
      /Lean Mass/,
    );
    expect(buildBodyCompositionLogRowVm(weightOnly[0]!, "lb", "weight").primaryMetric).toMatch(
      /Weight/,
    );
  });
});
