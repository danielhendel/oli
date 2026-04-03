import { describe, it, expect } from "@jest/globals";
import {
  deriveAppleHealthBodyUxPhase,
  HK_AUTH_NOT_DETERMINED,
  HK_AUTH_SHARING_DENIED,
  mapAuthNumbersToSnapshot,
  mapReadStatusesToSnapshot,
} from "../appleHealthBodyUxPhase";

describe("mapReadStatusesToSnapshot", () => {
  it("treats as authorized if any type is authorized (avoids basal-only false denied)", () => {
    expect(mapReadStatusesToSnapshot([1, 1, 1, 1, 2])).toEqual({ kind: "authorized" });
  });

  it("treats as denied only when every known code is denied", () => {
    expect(mapReadStatusesToSnapshot([1, 1, 1, 1, 1])).toEqual({ kind: "denied" });
  });

  it("returns not_determined when no authorization and any code is not determined", () => {
    expect(mapReadStatusesToSnapshot([1, 0, 0, 0, 0])).toEqual({ kind: "not_determined" });
  });
});

describe("deriveAppleHealthBodyUxPhase", () => {
  const base = {
    platform: "ios",
    authLoading: false,
    isBodySyncing: false,
    isBackfillRunning: false,
    seriesReady: true,
    trendsReady: true,
    observeTrends: true,
    overviewProbePending: false,
    hasAnyBodySampleInOli: false,
    hasHealthKitBodyPipelineEvidence: false,
    persistedPipelineEvidenceHydrated: true,
  };

  it("returns loading when auth is loading", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authLoading: true,
        authSnapshot: null,
      }),
    ).toBe("loading");
  });

  it("returns loading when auth snapshot not yet resolved", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: null,
      }),
    ).toBe("loading");
  });

  it("returns unavailable on non-iOS", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        platform: "android",
        authSnapshot: { kind: "authorized" },
      }),
    ).toBe("unavailable");
  });

  it("returns unavailable when HealthKit auth probe failed", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "unavailable", error: "no module" },
      }),
    ).toBe("unavailable");
  });

  it("returns not_determined when BodyMass is not determined", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: mapAuthNumbersToSnapshot(HK_AUTH_NOT_DETERMINED),
      }),
    ).toBe("not_determined");
  });

  it("returns denied when BodyMass is sharing denied", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: mapAuthNumbersToSnapshot(HK_AUTH_SHARING_DENIED),
      }),
    ).toBe("denied");
  });

  it("returns ready when auth says denied but Oli already has body samples (data overrides flaky probe)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "denied" },
        hasAnyBodySampleInOli: true,
      }),
    ).toBe("ready");
  });

  it("returns granted_no_data when auth says denied but incremental sync succeeded (pipeline evidence)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "denied" },
        hasHealthKitBodyPipelineEvidence: true,
      }),
    ).toBe("granted_no_data");
  });

  it("stays ready when body sync runs but Oli already has samples (no syncing banner)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        isBodySyncing: true,
        hasAnyBodySampleInOli: true,
      }),
    ).toBe("ready");
  });

  it("returns syncing when backfill is running", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        isBackfillRunning: true,
      }),
    ).toBe("syncing");
  });

  it("returns granted_no_data when authorized but no samples in Oli", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        hasAnyBodySampleInOli: false,
      }),
    ).toBe("granted_no_data");
  });

  it("returns ready when authorized and samples exist", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        hasAnyBodySampleInOli: true,
      }),
    ).toBe("ready");
  });

  it("returns loading when series not ready", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        seriesReady: false,
      }),
    ).toBe("loading");
  });

  it("returns ready when weight series has samples even if trends are still loading", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        trendsReady: false,
        hasAnyBodySampleInOli: true,
        authSnapshot: { kind: "denied" },
      }),
    ).toBe("ready");
  });

  it("grants_no_data before auth resolves when pipeline evidence exists and series are ready", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authLoading: true,
        authSnapshot: null,
        hasHealthKitBodyPipelineEvidence: true,
      }),
    ).toBe("granted_no_data");
  });

  it("returns loading when pipeline evidence exists but series is not ready (do not show connect/denied)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        seriesReady: false,
        authSnapshot: { kind: "denied" },
        hasHealthKitBodyPipelineEvidence: true,
      }),
    ).toBe("loading");
  });

  it("returns loading when pipeline evidence exists but trends are not ready", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        trendsReady: false,
        authSnapshot: { kind: "denied" },
        hasHealthKitBodyPipelineEvidence: true,
      }),
    ).toBe("loading");
  });

  it("returns ready when pipeline evidence and both series+trends ready with samples (auth denied)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "denied" },
        hasHealthKitBodyPipelineEvidence: true,
        hasAnyBodySampleInOli: true,
      }),
    ).toBe("ready");
  });

  it("does not wait on trends when observeTrends is false (Body overview)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        hasHealthKitBodyPipelineEvidence: true,
        observeTrends: false,
        trendsReady: false,
        hasAnyBodySampleInOli: false,
      }),
    ).toBe("granted_no_data");
  });

  it("waits on overview probe when pipeline evidence and probe still pending", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "denied" },
        hasHealthKitBodyPipelineEvidence: true,
        overviewProbePending: true,
        trendsReady: true,
        hasAnyBodySampleInOli: false,
      }),
    ).toBe("loading");
  });

  it("returns loading when not_determined but persisted evidence has not hydrated yet (avoid connect flicker)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: mapAuthNumbersToSnapshot(HK_AUTH_NOT_DETERMINED),
        persistedPipelineEvidenceHydrated: false,
      }),
    ).toBe("loading");
  });

  it("returns loading when denied but persisted evidence has not hydrated yet", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: mapAuthNumbersToSnapshot(HK_AUTH_SHARING_DENIED),
        persistedPipelineEvidenceHydrated: false,
      }),
    ).toBe("loading");
  });

  it("returns loading when not_determined, no samples, but persisted pipeline evidence (warm load)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        seriesReady: false,
        authSnapshot: mapAuthNumbersToSnapshot(HK_AUTH_NOT_DETERMINED),
        hasHealthKitBodyPipelineEvidence: true,
      }),
    ).toBe("loading");
  });

  it("returns not_determined after hydration when no pipeline evidence and no samples (true first run)", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: mapAuthNumbersToSnapshot(HK_AUTH_NOT_DETERMINED),
        persistedPipelineEvidenceHydrated: true,
        hasHealthKitBodyPipelineEvidence: false,
        seriesReady: true,
        hasAnyBodySampleInOli: false,
      }),
    ).toBe("not_determined");
  });

  it("returns ready when backfill runs but samples already in Oli", () => {
    expect(
      deriveAppleHealthBodyUxPhase({
        ...base,
        authSnapshot: { kind: "authorized" },
        isBackfillRunning: true,
        hasAnyBodySampleInOli: true,
      }),
    ).toBe("ready");
  });
});
