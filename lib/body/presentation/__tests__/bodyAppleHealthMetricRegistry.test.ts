import {
  BODY_APPLE_HEALTH_METRIC_REGISTRY,
  bodyMetricIncludeFlags,
  getBodyAppleHealthMetricDefinition,
} from "@/lib/body/presentation/bodyAppleHealthMetricRegistry";
import { APPLE_HEALTH_BODY_READ_TYPES } from "@/lib/integrations/appleHealth/appleHealthDomainRegistry";
import {
  resolveBodyMetricAppleHealthCardAction,
  resolveBodyMetricHistoryLabel,
} from "@/lib/body/presentation/resolveBodyMetricAppleHealthCardAction";

describe("Body Apple Health metric registry", () => {
  it("maps three Body cards to distinct HealthKit read types without BMI", () => {
    const [mass, fat, lean] = APPLE_HEALTH_BODY_READ_TYPES;
    expect(getBodyAppleHealthMetricDefinition("weight").appleHealthReadType).toBe(mass);
    expect(getBodyAppleHealthMetricDefinition("bodyFat").appleHealthReadType).toBe(fat);
    expect(getBodyAppleHealthMetricDefinition("leanTissue").appleHealthReadType).toBe(lean);
    expect(BODY_APPLE_HEALTH_METRIC_REGISTRY).toHaveLength(3);
    expect(
      BODY_APPLE_HEALTH_METRIC_REGISTRY.some((m) =>
        String(m.appleHealthReadType).toLowerCase().includes("bmi"),
      ),
    ).toBe(false);
  });

  it("include flags isolate a single metric", () => {
    expect(bodyMetricIncludeFlags("weight")).toEqual({
      weight: true,
      bodyFat: false,
      leanTissue: false,
    });
    expect(bodyMetricIncludeFlags("bodyFat")).toEqual({
      weight: false,
      bodyFat: true,
      leanTissue: false,
    });
  });
});

describe("resolveBodyMetricAppleHealthCardAction", () => {
  it("maps source + scope combinations exhaustively", () => {
    expect(
      resolveBodyMetricAppleHealthCardAction({
        metricId: "weight",
        sourceConnected: false,
        metricScopeOn: false,
        scopesLoaded: true,
        connecting: false,
        needsAttention: false,
      }).label,
    ).toBe("Sync now");

    expect(
      resolveBodyMetricAppleHealthCardAction({
        metricId: "weight",
        sourceConnected: true,
        metricScopeOn: true,
        scopesLoaded: true,
        connecting: false,
        needsAttention: false,
      }),
    ).toMatchObject({ kind: "connected", label: "Connected", chipLabel: "Connected" });

    expect(
      resolveBodyMetricAppleHealthCardAction({
        metricId: "bodyFat",
        sourceConnected: true,
        metricScopeOn: false,
        scopesLoaded: true,
        connecting: false,
        needsAttention: false,
      }),
    ).toMatchObject({ kind: "sync_off", label: "Sync off", chipLabel: "Sync Off" });

    expect(
      resolveBodyMetricAppleHealthCardAction({
        metricId: "leanTissue",
        sourceConnected: true,
        metricScopeOn: true,
        scopesLoaded: false,
        connecting: false,
        needsAttention: false,
      }).kind,
    ).toBe("sync_off");

    expect(
      resolveBodyMetricAppleHealthCardAction({
        metricId: "weight",
        sourceConnected: true,
        metricScopeOn: true,
        scopesLoaded: true,
        connecting: true,
        needsAttention: false,
      }).label,
    ).toBe("Connecting…");

    expect(
      resolveBodyMetricAppleHealthCardAction({
        metricId: "weight",
        sourceConnected: true,
        metricScopeOn: true,
        scopesLoaded: true,
        connecting: false,
        needsAttention: true,
      }),
    ).toMatchObject({ kind: "review_access", label: "Needs attention" });

    // Scope OFF must not become source disconnected.
    const syncOff = resolveBodyMetricAppleHealthCardAction({
      metricId: "bodyFat",
      sourceConnected: true,
      metricScopeOn: false,
      scopesLoaded: true,
      connecting: false,
      needsAttention: false,
    });
    expect(syncOff.chipLabel).toBe("Sync Off");
    expect(syncOff.chipLabel).not.toBe("Not Connected");
  });

  it("history label is Off when metric scope is off", () => {
    expect(
      resolveBodyMetricHistoryLabel({
        metricScopeOn: false,
        domainBackfillStatus: "completed",
      }),
    ).toBe("Off");
    expect(
      resolveBodyMetricHistoryLabel({
        metricScopeOn: true,
        domainBackfillStatus: "completed",
      }),
    ).toBe("Up to date");
  });
});
