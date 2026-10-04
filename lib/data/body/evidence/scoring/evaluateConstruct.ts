/**
 * Construct-level score evaluation with exact §4.3 precedence.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionResolverConstructResult,
  BodyCompositionScoreConstructResult,
  BodyCompositionScoreReasonCode,
  BodyCompositionScoreSex,
} from "@oli/contracts";

import {
  governedFmiChannel,
  governedH1WhtrChannel,
  governedH3LeanChannel,
  governedP1FfmiChannel,
  heightObservationFromIndex,
  indexMeasurementMethod,
  isValidWhoWaist,
  isValidWhtrObservation,
  observationMap,
  waistObservationFromWhtr,
} from "./channelLookup";
import { clip01 } from "./piecewiseLinear";
import { measuredAtReason, parseMeasuredAtMs, type ScoringTimestampInput } from "./recency";
import {
  H1_whtr,
  H2_fmi_female,
  H2_fmi_male,
  H3_almi_female,
  H3_almi_male,
  H3_ffmi_female,
  H3_ffmi_male,
  P1_ffmi_female,
  P1_ffmi_male,
  P3_fmi_female,
  P3_fmi_male,
} from "./transforms";

export type ConstructEvalContext = {
  bundle: BodyCompositionEvidenceBundle;
  construct: BodyCompositionResolverConstructResult | null;
  asOfMs: number;
  sex: BodyCompositionScoreSex | null;
  subjectHeightCm: number | null;
};

/**
 * Explicit measuredAt integrity for aggregate §4.2 rank 3.
 * Must not be inferred later from filtered finite timestamp arrays.
 */
export type MeasuredAtIntegrity = "valid" | "invalid";

export type ConstructEvalOutput = {
  result: BodyCompositionScoreConstructResult;
  scoringInputs: ScoringTimestampInput[];
  measuredAtIntegrity: MeasuredAtIntegrity;
};

function withheld(reason: BodyCompositionScoreReasonCode): BodyCompositionScoreConstructResult {
  return { value: null, primaryReason: reason };
}

function available(value: number): BodyCompositionScoreConstructResult {
  const clipped = clip01(value);
  if (!Number.isFinite(clipped)) return withheld("invalid_provenance");
  return { value: clipped, primaryReason: null };
}

function timestampInput(obs: BodyCompositionEvidenceObservation): ScoringTimestampInput | null {
  const ms = parseMeasuredAtMs(obs.measuredAt);
  if (ms == null) return null;
  return { measuredAtMs: ms, scanRef: obs.provenance.scanRef };
}

function collectTs(
  observations: (BodyCompositionEvidenceObservation | null | undefined)[],
): { inputs: ScoringTimestampInput[]; invalidMeasuredAt: boolean } {
  const inputs: ScoringTimestampInput[] = [];
  let invalidMeasuredAt = false;
  for (const obs of observations) {
    if (!obs) continue;
    const ts = timestampInput(obs);
    if (ts == null) invalidMeasuredAt = true;
    else inputs.push(ts);
  }
  return { inputs, invalidMeasuredAt };
}

function hasFuture(inputs: ScoringTimestampInput[], asOfMs: number): boolean {
  return inputs.some((i) => measuredAtReason(i.measuredAtMs, asOfMs) === "future_evidence");
}

function hasStale(inputs: ScoringTimestampInput[], asOfMs: number): boolean {
  return inputs.some((i) => measuredAtReason(i.measuredAtMs, asOfMs) === "evidence_too_old");
}

type ResolvedIndex = {
  observation: BodyCompositionEvidenceObservation | null;
  /** P1 only — true when FFMI channel is not resolved after higher ranks. */
  p1FfmiNotResolved: boolean;
};

function evaluateDxaIndexConstruct(args: {
  ctx: ConstructEvalContext;
  resolved: ResolvedIndex;
  transform: (value: number, sex: BodyCompositionScoreSex) => number | null;
}): ConstructEvalOutput {
  const { ctx, resolved } = args;
  const construct = ctx.construct;
  if (!construct) {
    return {
      result: withheld("unresolved_construct"),
      scoringInputs: [],
      measuredAtIntegrity: "valid",
    };
  }

  const byId = observationMap(ctx.bundle);
  const obs = resolved.observation;
  const heightObs = obs ? heightObservationFromIndex(obs, byId) : null;
  // DXA index constructs: primary metric measuredAt is the scoring timestamp.
  // Height presence is required, but H2/H3/P1/P3 stale/future tables do not
  // treat profile-height age as a scoring input (unlike H1 Waist/Height).
  const { inputs, invalidMeasuredAt } = collectTs(obs ? [obs] : []);
  const measuredAtIntegrity: MeasuredAtIntegrity =
    construct.status === "undated_only" || (obs != null && invalidMeasuredAt)
      ? "invalid"
      : "valid";

  // Rank 1
  if (construct.status === "undated_only") {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }
  if (obs && !Number.isFinite(obs.value)) {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }
  if (obs && invalidMeasuredAt) {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 2
  if (hasFuture(inputs, ctx.asOfMs)) {
    return { result: withheld("future_evidence"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 3
  if (ctx.sex == null) {
    return { result: withheld("required_sex_missing"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 4 — height required when an index observation is used
  if (obs) {
    if (heightObs == null || !(Number.isFinite(heightObs.value) && heightObs.value > 0)) {
      return {
        result: withheld("required_height_missing"),
        scoringInputs: inputs,
        measuredAtIntegrity,
      };
    }
  }

  // Rank 5
  if (construct.status === "unsupported") {
    return { result: withheld("unsupported_method"), scoringInputs: inputs, measuredAtIntegrity };
  }
  if (obs) {
    const method = indexMeasurementMethod(obs, byId);
    if (method !== "dxa") {
      return { result: withheld("unsupported_method"), scoringInputs: inputs, measuredAtIntegrity };
    }
  }

  // Rank 6
  if (construct.status === "conflict") {
    return { result: withheld("conflict_unresolved"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 7
  if (construct.status === "policy_not_frozen") {
    return { result: withheld("policy_not_frozen"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 8
  if (construct.status === "multiple_valid") {
    return {
      result: withheld("multiple_valid_unfrozen"),
      scoringInputs: inputs,
      measuredAtIntegrity,
    };
  }

  // Rank 9
  if (construct.status === "insufficient") {
    return { result: withheld("unresolved_construct"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 10 / 11
  if (!obs) {
    if (resolved.p1FfmiNotResolved) {
      return {
        result: withheld("p1_ffmi_not_resolved"),
        scoringInputs: inputs,
        measuredAtIntegrity,
      };
    }
    return { result: withheld("unresolved_construct"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 12
  if (hasStale(inputs, ctx.asOfMs)) {
    return { result: withheld("evidence_too_old"), scoringInputs: inputs, measuredAtIntegrity };
  }

  const transformed = args.transform(obs.value, ctx.sex);
  if (transformed == null) {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }
  return { result: available(transformed), scoringInputs: inputs, measuredAtIntegrity };
}

export function evaluateH1(ctx: ConstructEvalContext): ConstructEvalOutput {
  const construct = ctx.construct;
  if (!construct) {
    return {
      result: withheld("unresolved_construct"),
      scoringInputs: [],
      measuredAtIntegrity: "valid",
    };
  }
  const byId = observationMap(ctx.bundle);
  const governed = governedH1WhtrChannel(construct, byId);
  const whtr = governed?.observation ?? null;
  const waist = whtr ? waistObservationFromWhtr(whtr, byId) : null;
  const height = whtr ? heightObservationFromIndex(whtr, byId) : null;
  const { inputs, invalidMeasuredAt } = collectTs([whtr, waist, height]);
  const measuredAtIntegrity: MeasuredAtIntegrity =
    construct.status === "undated_only" || (whtr != null && invalidMeasuredAt)
      ? "invalid"
      : "valid";

  // Rank 1
  if (construct.status === "undated_only") {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }
  if (whtr && !Number.isFinite(whtr.value)) {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }
  if (whtr && invalidMeasuredAt) {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 2
  if (hasFuture(inputs, ctx.asOfMs)) {
    return { result: withheld("future_evidence"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 3 — H1 sex-independent

  // Rank 4
  if (whtr && (height == null || !(Number.isFinite(height.value) && height.value > 0))) {
    return {
      result: withheld("required_height_missing"),
      scoringInputs: inputs,
      measuredAtIntegrity,
    };
  }

  // Rank 5
  if (construct.status === "unsupported") {
    return { result: withheld("unsupported_method"), scoringInputs: inputs, measuredAtIntegrity };
  }
  if (whtr) {
    if (!isValidWhtrObservation(whtr) || !waist || !isValidWhoWaist(waist)) {
      return { result: withheld("unsupported_method"), scoringInputs: inputs, measuredAtIntegrity };
    }
  }

  // Rank 6
  if (construct.status === "conflict") {
    return { result: withheld("conflict_unresolved"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 7
  if (construct.status === "policy_not_frozen") {
    return { result: withheld("policy_not_frozen"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 8 — multiple_valid only without governed WHtR (§10.2)
  if (construct.status === "multiple_valid" && !governed) {
    return {
      result: withheld("multiple_valid_unfrozen"),
      scoringInputs: inputs,
      measuredAtIntegrity,
    };
  }

  // Rank 9
  if (construct.status === "insufficient") {
    return { result: withheld("unresolved_construct"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 10
  if (!governed || !whtr) {
    return { result: withheld("unresolved_construct"), scoringInputs: inputs, measuredAtIntegrity };
  }

  // Rank 12
  if (hasStale(inputs, ctx.asOfMs)) {
    return { result: withheld("evidence_too_old"), scoringInputs: inputs, measuredAtIntegrity };
  }

  const value = H1_whtr(whtr.value);
  if (value == null) {
    return { result: withheld("invalid_provenance"), scoringInputs: inputs, measuredAtIntegrity };
  }
  return { result: available(value), scoringInputs: inputs, measuredAtIntegrity };
}

export function evaluateH2(ctx: ConstructEvalContext): ConstructEvalOutput {
  const byId = observationMap(ctx.bundle);
  const governed = ctx.construct ? governedFmiChannel(ctx.construct, byId) : null;
  return evaluateDxaIndexConstruct({
    ctx,
    resolved: {
      observation: governed?.observation ?? null,
      p1FfmiNotResolved: false,
    },
    transform: (value, sex) => (sex === "male" ? H2_fmi_male(value) : H2_fmi_female(value)),
  });
}

export function evaluateH3(ctx: ConstructEvalContext): ConstructEvalOutput {
  const byId = observationMap(ctx.bundle);
  const governed = ctx.construct ? governedH3LeanChannel(ctx.construct, byId) : null;
  return evaluateDxaIndexConstruct({
    ctx,
    resolved: {
      observation: governed?.observation ?? null,
      p1FfmiNotResolved: false,
    },
    transform: (value, sex) => {
      if (!governed) return null;
      if (governed.kind === "almi") {
        return sex === "male" ? H3_almi_male(value) : H3_almi_female(value);
      }
      return sex === "male" ? H3_ffmi_male(value) : H3_ffmi_female(value);
    },
  });
}

export function evaluateP1(ctx: ConstructEvalContext): ConstructEvalOutput {
  const byId = observationMap(ctx.bundle);
  const governed = ctx.construct ? governedP1FfmiChannel(ctx.construct, byId) : null;
  return evaluateDxaIndexConstruct({
    ctx,
    resolved: {
      observation: governed?.observation ?? null,
      p1FfmiNotResolved: governed == null,
    },
    transform: (value, sex) => (sex === "male" ? P1_ffmi_male(value) : P1_ffmi_female(value)),
  });
}

export function evaluateP3(ctx: ConstructEvalContext): ConstructEvalOutput {
  const byId = observationMap(ctx.bundle);
  const governed = ctx.construct ? governedFmiChannel(ctx.construct, byId) : null;
  return evaluateDxaIndexConstruct({
    ctx,
    resolved: {
      observation: governed?.observation ?? null,
      p1FfmiNotResolved: false,
    },
    transform: (value, sex) => (sex === "male" ? P3_fmi_male(value) : P3_fmi_female(value)),
  });
}

export function constructReasonsFromScores<K extends string>(
  scores: Record<K, BodyCompositionScoreConstructResult>,
): Partial<Record<K, BodyCompositionScoreReasonCode>> {
  const out: Partial<Record<K, BodyCompositionScoreReasonCode>> = {};
  for (const key of Object.keys(scores) as K[]) {
    const reason = scores[key].primaryReason;
    if (reason != null) out[key] = reason;
  }
  return out;
}
