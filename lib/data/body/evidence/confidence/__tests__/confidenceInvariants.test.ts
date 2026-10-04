/**
 * Assessment Confidence scientific boundary invariants.
 */
import { describe, expect, it } from "@jest/globals";
import {
  BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
  bodyCompositionAssessmentConfidenceSchema,
  bodyCompositionConfidenceLabelSchema,
} from "@oli/contracts";
import fs from "node:fs";
import path from "node:path";

import { resolveBodyCompositionEvidence } from "../../resolver/resolveBodyCompositionEvidence";
import { AS_OF, baseObservation, bundleWith, emptyBundle } from "../../resolver/testFixtures";
import { assessBodyCompositionConfidence } from "../assessBodyCompositionConfidence";
import {
  DEVICE_QUALITY_POLICY_STATE,
  FROZEN_LABEL_RULE_COUNT,
  METHOD_QUALITY_POLICY_STATE,
  RECENCY_LABEL_POLICY_STATE,
} from "../policy";

describe("Assessment Confidence invariants", () => {
  it("rejects unsupported qualitative labels at schema boundary", () => {
    expect(() => bodyCompositionConfidenceLabelSchema.parse("very_high")).toThrow();
    expect(() => bodyCompositionConfidenceLabelSchema.parse("excellent")).toThrow();
    expect(() => bodyCompositionConfidenceLabelSchema.parse("elite")).toThrow();
    expect(() => bodyCompositionConfidenceLabelSchema.parse("perfect")).toThrow();
    expect(bodyCompositionConfidenceLabelSchema.parse("limited")).toBe("limited");
    expect(bodyCompositionConfidenceLabelSchema.parse("strong")).toBe("strong");
  });

  it("never mutates bundle or resolution", () => {
    const bundle = bundleWith([
      baseObservation({
        observationId: "bf1",
        metricKey: "fat_percent",
        value: 22,
        measuredAt: "2026-05-01T00:00:00.000Z",
        constructEligibility: ["H2"],
        redundancyGroup: "bf_fat_mass_fmi",
      }),
    ]);
    const resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
    const beforeBundle = JSON.stringify(bundle);
    const beforeResolution = JSON.stringify(resolution);
    assessBodyCompositionConfidence({ bundle, resolution, asOf: AS_OF });
    expect(JSON.stringify(bundle)).toBe(beforeBundle);
    expect(JSON.stringify(resolution)).toBe(beforeResolution);
  });

  it("forbids numeric confidence, scores, and health status fields", () => {
    const confidence = assessBodyCompositionConfidence({
      bundle: emptyBundle(),
      resolution: resolveBodyCompositionEvidence({ bundle: emptyBundle(), asOf: AS_OF }),
      asOf: AS_OF,
    });
    const parsed = bodyCompositionAssessmentConfidenceSchema.parse(confidence);
    const json = JSON.stringify(parsed);
    expect(json).not.toMatch(
      /confidenceScore|qualityScore|healthScore|performanceScore|"score"|riskPercent|Deficient|Optimal|Elite|Very High/,
    );
    expect(parsed.confidenceVersion).toBe(BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION);
    expect(FROZEN_LABEL_RULE_COUNT).toBe(0);
    expect(RECENCY_LABEL_POLICY_STATE).toBe("recency_threshold_not_frozen");
    expect(METHOD_QUALITY_POLICY_STATE).toBe("method_quality_policy_not_frozen");
    expect(DEVICE_QUALITY_POLICY_STATE).toBe("device_quality_policy_not_frozen");
  });

  it("does not contain a hidden numeric points/weights model in confidence sources", () => {
    const dir = path.join(__dirname, "..");
    const files = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".ts") && !f.includes("__tests__"));
    const joined = files
      .map((f) => fs.readFileSync(path.join(dir, f), "utf8"))
      .join("\n");
    expect(joined).not.toMatch(/\bconfidenceScore\b/);
    expect(joined).not.toMatch(/\bqualityScore\b/);
    expect(joined).not.toMatch(/\bnormalizedScore\b/);
    expect(joined).not.toMatch(/0\s*-\s*100|0–100/);
    // Counts as factual metadata are allowed; combining into a score is not.
    expect(joined).not.toMatch(/labelRank|ordinalLabel|labelToNumber/);
  });

  it("does not consume parser/extraction confidence fields", () => {
    const dir = path.join(__dirname, "..");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
    const joined = files.map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("\n");
    expect(joined).not.toMatch(/candidateConfidence|extractionConfidence|parserConfidence/);
    expect(joined).toMatch(/parser_confidence_not_consumed/);
  });

  it("confidence module has no Firebase / React / persistence imports", () => {
    const dir = path.join(__dirname, "..");
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".ts"));
    const importLines = files
      .flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n"))
      .filter((line) => /^\s*import\b/.test(line))
      .join("\n");
    expect(importLines).not.toMatch(/firebase|firestore|AsyncStorage|react-native|@react-navigation/i);
    const codeLines = files
      .flatMap((f) => fs.readFileSync(path.join(dir, f), "utf8").split("\n"))
      .filter((line) => !/^\s*(\/\/|\*|\/\*|\*\/)/.test(line))
      .join("\n");
    expect(codeLines).not.toMatch(/Date\.now\s*\(/);
    expect(codeLines).not.toMatch(/Math\.random\s*\(/);
  });
});
