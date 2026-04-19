import { describe, it, expect } from "@jest/globals";
import { OLI_SLEEP_SCORE_VERSION } from "@oli/contracts";
import type { DailySleepFacts } from "../../types/health";
import {
  attachOliSleepScoreToSleepFacts,
  computeOliSleepScoreV1,
  normalizeDeepRatio,
  normalizeRemRatio,
  normalizeSleepDurationMinutes,
  normalizeSleepEfficiencyRatio,
  normalizeSleepLatencyMinutes,
} from "../computeOliSleepScoreV1";

const computedAt = "2026-04-18T12:00:00.000Z";

describe("normalizeSleepDurationMinutes", () => {
  it("matches piecewise anchors", () => {
    expect(normalizeSleepDurationMinutes(240)).toBe(0);
    expect(normalizeSleepDurationMinutes(300)).toBeCloseTo(0.35, 5);
    expect(normalizeSleepDurationMinutes(360)).toBeCloseTo(0.65, 5);
    expect(normalizeSleepDurationMinutes(420)).toBeCloseTo(0.9, 5);
    expect(normalizeSleepDurationMinutes(480)).toBe(1);
    expect(normalizeSleepDurationMinutes(600)).toBe(1);
  });
});

describe("normalizeSleepEfficiencyRatio", () => {
  it("treats percent-like values", () => {
    expect(normalizeSleepEfficiencyRatio(85)).toBeCloseTo(normalizeSleepEfficiencyRatio(0.85), 5);
  });

  it("clamps below and above the curve", () => {
    expect(normalizeSleepEfficiencyRatio(0.5)).toBe(0);
    expect(normalizeSleepEfficiencyRatio(0.99)).toBe(1);
  });
});

describe("normalizeSleepLatencyMinutes", () => {
  it("prefers lower latency", () => {
    expect(normalizeSleepLatencyMinutes(10)).toBe(1);
    expect(normalizeSleepLatencyMinutes(60)).toBe(0);
    expect(normalizeSleepLatencyMinutes(5)).toBe(1);
    expect(normalizeSleepLatencyMinutes(90)).toBe(0);
  });
});

describe("normalizeRemRatio / normalizeDeepRatio", () => {
  it("interpolates mid bands", () => {
    expect(normalizeRemRatio(0.175)).toBeGreaterThan(0.6);
    expect(normalizeDeepRatio(0.15)).toBeGreaterThan(0.65);
  });
});

describe("computeOliSleepScoreV1", () => {
  it("returns null when sleep block is absent", () => {
    expect(computeOliSleepScoreV1({ sleep: undefined, computedAt })).toBeNull();
  });

  it("returns null score document when duration is missing", () => {
    const doc = computeOliSleepScoreV1({
      sleep: { efficiency: 0.9 },
      computedAt,
    });
    expect(doc).not.toBeNull();
    expect(doc!.value).toBeNull();
    expect(doc!.confidence).toBe(0);
    expect(doc!.reasons[0]).toContain("no Oli score");
  });

  it("re-normalizes weights when optional components are missing", () => {
    const sleep: DailySleepFacts = {
      mainSleepMinutes: 420,
      efficiency: 0.88,
    };
    const doc = computeOliSleepScoreV1({ sleep, computedAt });
    expect(doc).not.toBeNull();
    expect(doc!.weights.duration + doc!.weights.efficiency).toBeCloseTo(1, 5);
    expect(doc!.weights.latency).toBe(0);
    expect(doc!.components.latency).toBeNull();
  });

  it("subtracts confidence for missing inputs and nulls value when confidence < 0.5", () => {
    const sleep: DailySleepFacts = {
      mainSleepMinutes: 420,
    };
    const doc = computeOliSleepScoreV1({ sleep, computedAt });
    expect(doc!.confidence).toBeCloseTo(0.35, 5);
    expect(doc!.value).toBeNull();
    expect(doc!.reasons[0]).toContain("incomplete");
  });

  it("subtracts confidence when domain sleep confidence is low", () => {
    const sleep: DailySleepFacts = {
      mainSleepMinutes: 420,
      efficiency: 0.92,
      latencyMinutes: 12,
      remSleepMinutes: 90,
      deepSleepMinutes: 70,
    };
    const doc = computeOliSleepScoreV1({
      sleep,
      computedAt,
      domainConfidenceSleep: 0.4,
    });
    expect(doc!.confidence).toBeCloseTo(0.8, 5);
    expect(doc!.value).not.toBeNull();
  });

  it("sets version and computedAt", () => {
    const sleep: DailySleepFacts = { mainSleepMinutes: 480 };
    const doc = computeOliSleepScoreV1({ sleep, computedAt });
    expect(doc!.version).toBe(OLI_SLEEP_SCORE_VERSION);
    expect(doc!.computedAt).toBe(computedAt);
  });
});

describe("attachOliSleepScoreToSleepFacts", () => {
  it("merges oliSleepScore onto sleep facts for API-shaped input", () => {
    const sleep: DailySleepFacts = {
      mainSleepMinutes: 400,
      efficiency: 0.88,
      latencyMinutes: 15,
      remSleepMinutes: 80,
      deepSleepMinutes: 90,
    };
    const merged = attachOliSleepScoreToSleepFacts(sleep, { computedAt });
    expect(merged.oliSleepScore).toBeDefined();
    expect(merged.oliSleepScore!.version).toBe(OLI_SLEEP_SCORE_VERSION);
    expect(typeof merged.oliSleepScore!.value).toBe("number");
  });
});
