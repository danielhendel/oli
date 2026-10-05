/**
 * BCV-015 executor — Missingness + Resolver-status simulation (plan §23.17.4).
 *
 * Uses the FULL pipeline: buildBundle → resolveBodyCompositionEvidence →
 * scoreHealthComposition / scorePerformanceSupportingComposition (approved, read-only).
 *
 * EXECUTION MODES (recorded per row as `executionMode`)
 *  - reresolve                 : mutate baseline bundle, re-resolve, score.
 *  - status_only               : policy_not_frozen / insufficient (0 candidates):
 *                                resolve baseline, patch target construct status, score.
 *  - resolve_then_mutate       : the mutation would make the bundle schema-invalid (and the
 *                                Resolver would then discard EVERY construct), so the baseline
 *                                is resolved first and the observation is mutated afterwards
 *                                (same pattern as the approved engine's own tests).
 *  - baseline                  : no mutation (demographic-only or resolved rows).
 *
 * RESOLVER-STATUS PATCH POLICY (all patches are recorded, never silent)
 *  The approved Resolver (draft_v1) never emits `conflict`, `unsupported`, or (for
 *  same-value duplicates) `multiple_valid`, and reports P1 / FFMI-primary H3 as
 *  `policy_not_frozen` whenever the FFM input of an FFMI is in the bundle. Where the
 *  natural re-resolved target-construct status differs from the fixture's declared
 *  `resolverStatus` (treating resolved ≡ resolved_with_supporting), the construct status
 *  is patched AFTER resolve to the declared status. `resolverStatusObservedNatural`,
 *  `resolverStatusPatched` and `baselineNormalization` expose every deviation.
 */

import type {
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceObservation,
  BodyCompositionEvidenceResolution,
  BodyCompositionResolverConstructResult,
  BodyCompositionResolverConstructStatus,
} from "@oli/contracts";
import { resolveBodyCompositionEvidence } from "@oli/lib/data/body/evidence/resolver/resolveBodyCompositionEvidence";
import { baseObservation } from "@oli/lib/data/body/evidence/resolver/testFixtures";
import { scoreHealthComposition } from "@oli/lib/data/body/evidence/scoring/scoreHealthComposition";
import { scorePerformanceSupportingComposition } from "@oli/lib/data/body/evidence/scoring/scorePerformanceSupportingComposition";

import { AS_OF, EPS_SURF } from "./constants";
import { BCV015_MATRIX, conflictDelta } from "./fixtures015Matrix";
import type { FixtureFamily } from "./fixtures015Matrix";
import { personaById } from "./personas";
import type { Persona } from "./personas";
import { OBS_IDS, PER_INDEX_HEIGHT_IDS, buildBundle } from "./scoringBundle";
import type { BundleSpec } from "./scoringBundle";

export type FixtureRow = {
  // ---- §23.17.4.6 required result contract (frozen field names) ----
  fixtureId: string;
  baselinePersonaId: string;
  engine: string;
  targetConstruct: string;
  targetChannel: string;
  resolverStatus: string;
  missingnessMutation: string | null;
  demographicMutation: string | null;
  candidateCount: number | null;
  candidateRelationship: string | null;
  expectedAvailability: string;
  expectedPrimaryReason: string | null;
  observedAvailability: string | null;
  observedPrimaryReason: string | null;
  // ---- extras ----
  fixtureInstanceId: string;
  executable: boolean;
  executionMode: string;
  structuralPass: boolean | null;
  baselineValue: number | null;
  conflictDelta: number | null;
  resolverStatusObservedNatural: string | null;
  resolverStatusPatched: boolean;
  /** status_only_fixture | natural_resolver_status_differs_from_declared | null */
  resolverStatusPatchReason: string | null;
  baselineNormalization: string[];
  targetPrimaryEvidenceRefs: string[];
  aggregateStatus: string | null;
  aggregatePrimaryReason: string | null;
  measuredAtState: string;
  methodState: string;
  notes: string;
};

const RESOLVED_CLASS = new Set<string>(["resolved", "resolved_with_supporting"]);

/* ------------------------------------------------------------------ */
/* helpers                                                              */
/* ------------------------------------------------------------------ */

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x)) as T;
}

function constructIdOf(key: FixtureFamily["targetKey"]): "H1" | "H2" | "H3" | "P1" | "P3" | null {
  switch (key) {
    case "H1":
      return "H1";
    case "H2":
      return "H2";
    case "H3_ALMI":
    case "H3_FFMI":
      return "H3";
    case "P1":
      return "P1";
    case "P3":
      return "P3";
    default:
      return null;
  }
}

function targetIndexObsId(key: FixtureFamily["targetKey"]): string {
  switch (key) {
    case "H1":
      return OBS_IDS.whtr;
    case "H2":
    case "P3":
      return OBS_IDS.fmi;
    case "H3_ALMI":
      return OBS_IDS.almi;
    case "H3_FFMI":
    case "P1":
      return OBS_IDS.ffmi;
    default:
      throw new Error(`no_target_obs_for:${key}`);
  }
}

function targetHeightObsId(key: FixtureFamily["targetKey"]): string {
  switch (key) {
    case "H1":
      return PER_INDEX_HEIGHT_IDS.whtr;
    case "H2":
    case "P3":
      return PER_INDEX_HEIGHT_IDS.fmi;
    case "H3_ALMI":
      return PER_INDEX_HEIGHT_IDS.almi;
    case "H3_FFMI":
    case "P1":
      return PER_INDEX_HEIGHT_IDS.ffmi;
    default:
      throw new Error(`no_height_obs_for:${key}`);
  }
}

/** Raw DXA input observation ids behind a DXA index. */
function dxaInputIds(key: FixtureFamily["targetKey"]): string[] {
  switch (key) {
    case "H2":
    case "P3":
      return [OBS_IDS.fm];
    case "H3_ALMI":
      return [...OBS_IDS.limbs];
    case "H3_FFMI":
    case "P1":
      return [OBS_IDS.ffm];
    default:
      return [];
  }
}

function baselineValueOf(p: Persona, key: FixtureFamily["targetKey"]): number | null {
  switch (key) {
    case "H1":
      return p.whtr;
    case "H2":
    case "P3":
      return p.fmi;
    case "H3_ALMI":
      return p.almi;
    case "H3_FFMI":
    case "P1":
      return p.ffmi;
    default:
      return null;
  }
}

export function baselineSpec(p: Persona, family: FixtureFamily): BundleSpec {
  return {
    sex: p.sex,
    ageYears: p.age,
    heightCm: p.heightCm,
    whtr: p.whtr,
    fmi: p.fmi,
    almi: p.almi,
    ffmi: p.ffmi,
    perIndexHeight: true,
    // FFMI-primary H3 requires the ALMI path to be absent.
    includeAlmi: family.targetKey !== "H3_FFMI",
    includeFfmi: true,
  };
}

function findObs(
  bundle: BodyCompositionEvidenceBundle,
  id: string,
): BodyCompositionEvidenceObservation {
  const o = bundle.observations.find((x) => x.observationId === id);
  if (!o) throw new Error(`fixture_obs_missing:${id}`);
  return o;
}

function nonScoringVat(
  id: string,
  metricKey: "visceral_fat_mass" | "visceral_fat_volume",
  value: number,
  sourceEventRef: string,
): BodyCompositionEvidenceObservation {
  const o = baseObservation({
    observationId: id,
    metricKey,
    value,
    measuredAt: AS_OF,
    source: {
      sourceSystem: "body_scan",
      measurementMethod: "dxa",
      deviceFamily: null,
      deviceModel: null,
    },
  });
  return { ...o, provenance: { ...o.provenance, sourceEventRef } };
}

/* ------------------------------------------------------------------ */
/* mutations                                                            */
/* ------------------------------------------------------------------ */

type Mutation = {
  mode: "baseline" | "reresolve" | "status_only" | "resolve_then_mutate";
  /** Applied to the bundle BEFORE resolve. */
  pre?: (b: BodyCompositionEvidenceBundle) => void;
  /** Applied to a clone of the bundle AFTER resolve (before scoring). */
  post?: (b: BodyCompositionEvidenceBundle) => void;
  /** Force construct status after normalization regardless of natural status. */
  forceStatus?: BodyCompositionResolverConstructStatus;
};

function addSecondObservation(
  b: BodyCompositionEvidenceBundle,
  key: FixtureFamily["targetKey"],
  suffix: string,
  opts: { value?: number },
): BodyCompositionEvidenceObservation {
  const orig = findObs(b, targetIndexObsId(key));
  const dup: BodyCompositionEvidenceObservation = {
    ...clone(orig),
    observationId: `${orig.observationId}__${suffix}`,
    value: opts.value ?? orig.value,
    provenance: { ...clone(orig.provenance), sourceEventRef: `bcv015-${suffix}` },
  };
  b.observations.push(dup);
  return dup;
}

function setUnsupportedMethodPre(b: BodyCompositionEvidenceBundle, key: FixtureFamily["targetKey"]): void {
  const idx = findObs(b, targetIndexObsId(key));
  if (idx.source.measurementMethod === "dxa") idx.source.measurementMethod = "consumer_bia";
  for (const id of dxaInputIds(key)) findObs(b, id).source.measurementMethod = "consumer_bia";
}

function setUnknownWaistProtocol(b: BodyCompositionEvidenceBundle): void {
  const w = findObs(b, OBS_IDS.waist);
  w.provenance.protocolId = "unknown";
  w.provenance.protocolVersion = null;
}

export function mutationFor(family: FixtureFamily, persona: Persona): Mutation {
  const key = family.targetKey;
  const id = family.fixtureId;
  const baseVal = baselineValueOf(persona, key);

  // ---- demographic / aggregate ----
  if (family.demographicMutation === "MISSING_DOB") {
    return {
      mode: "baseline",
      pre: (b) => {
        b.subjectContext.dateOfBirth = null;
      },
    };
  }
  if (family.demographicMutation === "MISSING_SEX") {
    return {
      mode: "baseline",
      pre: (b) => {
        b.subjectContext.sexAtBirth = null;
      },
    };
  }
  if (family.demographicMutation === "MISSING_HEIGHT") {
    return {
      mode: "resolve_then_mutate",
      post: (b) => {
        const hid = targetHeightObsId(key);
        b.observations = b.observations.filter((o) => o.observationId !== hid);
      },
    };
  }

  // ---- missingness ----
  if (family.mutationType === "MISSING_VALUE") {
    return {
      mode: "resolve_then_mutate",
      post: (b) => {
        findObs(b, targetIndexObsId(key)).value = Number.NaN;
      },
    };
  }
  if (family.mutationType === "MISSING_MEASURED_AT") {
    return {
      mode: "resolve_then_mutate",
      post: (b) => {
        findObs(b, targetIndexObsId(key)).measuredAt = "";
      },
    };
  }
  if (family.mutationType === "MISSING_REQUIRED_METHOD") {
    if (key === "H1") return { mode: "resolve_then_mutate", post: setUnknownWaistProtocol };
    return { mode: "reresolve", pre: (b) => setUnsupportedMethodPre(b, key) };
  }

  // ---- resolver-status rows ----
  switch (family.resolverStatus) {
    case "resolved":
      return { mode: "baseline" };
    case "resolved_with_supporting":
      return {
        mode: "reresolve",
        pre: (b) => {
          addSecondObservation(b, key, "sup", {});
        },
      };
    case "multiple_valid": {
      if (id === "H1_MULTIPLE_VALID_NO_GOVERNED_WHTR") {
        return {
          mode: "reresolve",
          pre: (b) => {
            b.observations = b.observations.filter((o) => o.observationId !== OBS_IDS.whtr);
            b.observations.push(
              nonScoringVat("bcv015-vat-mass", "visceral_fat_mass", 0.4, "bcv015-h1-mv-vat-a"),
              // valueL = 1.20 L → 1200 cm³ (canonical unit of visceral_fat_volume)
              nonScoringVat("bcv015-vat-vol", "visceral_fat_volume", 1200, "bcv015-h1-mv-vat-b"),
            );
          },
        };
      }
      if (id === "H1_MULTIPLE_VALID_GOVERNED_WHTR") {
        return {
          mode: "reresolve",
          pre: (b) => {
            findObs(b, OBS_IDS.whtr).provenance.sourceEventRef = "bcv015-h1-mv-whtr-primary";
            b.observations.push(
              nonScoringVat("bcv015-vat-mass", "visceral_fat_mass", 0.5, "bcv015-h1-mv-vat-support"),
            );
          },
        };
      }
      return {
        mode: "reresolve",
        pre: (b) => {
          addSecondObservation(b, key, "mv", {});
        },
        forceStatus: "multiple_valid",
      };
    }
    case "policy_not_frozen":
      return { mode: "status_only", forceStatus: "policy_not_frozen" };
    case "insufficient":
      return { mode: "status_only", forceStatus: "insufficient" };
    case "conflict": {
      const delta = conflictDelta(baseVal as number, EPS_SURF);
      return {
        mode: "reresolve",
        pre: (b) => {
          const orig = findObs(b, targetIndexObsId(key));
          orig.value = (baseVal as number) - delta;
          addSecondObservation(b, key, "conf", { value: (baseVal as number) + delta });
        },
        forceStatus: "conflict",
      };
    }
    case "undated_only":
      return {
        mode: "resolve_then_mutate",
        post: (b) => {
          findObs(b, targetIndexObsId(key)).measuredAt = "";
        },
        forceStatus: "undated_only",
      };
    case "unsupported":
      if (key === "H1") {
        return { mode: "resolve_then_mutate", post: setUnknownWaistProtocol, forceStatus: "unsupported" };
      }
      return {
        mode: "reresolve",
        pre: (b) => setUnsupportedMethodPre(b, key),
        forceStatus: "unsupported",
      };
    default:
      throw new Error(`unhandled_fixture_status:${id}:${family.resolverStatus}`);
  }
}

/* ------------------------------------------------------------------ */
/* resolution patching                                                  */
/* ------------------------------------------------------------------ */

function patchConstruct(
  r: BodyCompositionEvidenceResolution,
  constructId: string,
  fn: (c: BodyCompositionResolverConstructResult) => BodyCompositionResolverConstructResult,
): BodyCompositionEvidenceResolution {
  return { ...r, constructs: r.constructs.map((c) => (c.constructId === constructId ? fn(c) : c)) };
}

function constructOf(r: BodyCompositionEvidenceResolution, id: string): BodyCompositionResolverConstructResult {
  const c = r.constructs.find((x) => x.constructId === id);
  if (!c) throw new Error(`construct_missing:${id}`);
  return c;
}

/**
 * Baseline normalization for the approved Resolver's FFMI/FFM open-precedence behaviour:
 * with an FFMI and its FFM input both in the bundle, P1 (and FFMI-primary H3) is reported as
 * `policy_not_frozen`. Normalize to `resolved` pointing at the governed FFMI channel so that
 * non-target constructs stay at their valid baseline. Recorded in `baselineNormalization`.
 */
function normalizeBaseline(
  r: BodyCompositionEvidenceResolution,
  key: FixtureFamily["targetKey"],
  engine: string,
  notes: string[],
): BodyCompositionEvidenceResolution {
  let out = r;
  const targets: Array<"P1" | "H3"> = [];
  if (engine === "Performance") targets.push("P1");
  if (engine === "Health" && key === "H3_FFMI") targets.push("H3");
  for (const cid of targets) {
    const c = constructOf(out, cid);
    if (RESOLVED_CLASS.has(c.status)) continue;
    const ffmi = c.channels.find((ch) => ch.channelId === "ffmi");
    const ref = ffmi?.primaryEvidenceRefs[0];
    if (ffmi && RESOLVED_CLASS.has(ffmi.status) && ref) {
      notes.push(`${cid}:${c.status}->resolved(ffmi_open_precedence_normalization)`);
      out = patchConstruct(out, cid, (cc) => ({
        ...cc,
        status: "resolved",
        primaryEvidenceRefs: [ref],
        supportingEvidenceRefs: cc.primaryEvidenceRefs.filter((x) => x !== ref),
      }));
    }
  }
  return out;
}

function forceConstructStatus(
  r: BodyCompositionEvidenceResolution,
  constructId: string,
  status: BodyCompositionResolverConstructStatus,
): BodyCompositionEvidenceResolution {
  return patchConstruct(r, constructId, (c) => {
    if (status === "insufficient") {
      return {
        ...c,
        status,
        primaryEvidenceRefs: [],
        supportingEvidenceRefs: [],
        alternateEvidenceRefs: [],
        channels: c.channels.map((ch) => ({
          ...ch,
          status: "insufficient" as const,
          primaryEvidenceRefs: [],
          supportingEvidenceRefs: [],
          alternateEvidenceRefs: [],
        })),
      };
    }
    return { ...c, status };
  });
}

/* ------------------------------------------------------------------ */
/* execution                                                            */
/* ------------------------------------------------------------------ */

export function runFixtureInstance(family: FixtureFamily, personaId: string): FixtureRow {
  const persona = personaById(personaId);
  const baseline = baselineValueOf(persona, family.targetKey);
  const instId = `${family.fixtureId}__${personaId}`;

  const common = {
    fixtureId: family.fixtureId,
    baselinePersonaId: personaId,
    engine: family.engine,
    targetConstruct: family.targetConstruct,
    targetChannel: family.targetChannel,
    resolverStatus: family.resolverStatus,
    missingnessMutation: family.mutationType === "none" ? null : family.mutationType,
    demographicMutation: family.demographicMutation === "none" ? null : family.demographicMutation,
    candidateCount: family.candidateCount,
    candidateRelationship: family.candidateRelationship,
    expectedAvailability: family.expectedAvailability,
    expectedPrimaryReason: family.expectedPrimaryReason,
    fixtureInstanceId: instId,
    executable: family.executable,
    baselineValue: baseline,
    measuredAtState: family.measuredAtState,
    methodState: family.methodState,
    notes: family.notes,
  };

  if (!family.executable) {
    // not_applicable rows are LISTED but MUST NOT execute (no bundle, no resolve, no score).
    return {
      ...common,
      observedAvailability: null,
      observedPrimaryReason: null,
      executionMode: "not_executed_not_applicable",
      structuralPass: null,
      conflictDelta: null,
      resolverStatusObservedNatural: null,
      resolverStatusPatched: false,
      resolverStatusPatchReason: null,
      baselineNormalization: [],
      targetPrimaryEvidenceRefs: [],
      aggregateStatus: null,
      aggregatePrimaryReason: null,
    };
  }

  const m = mutationFor(family, persona);
  const bundle = buildBundle(baselineSpec(persona, family));
  if (m.pre) m.pre(bundle);

  let resolution = resolveBodyCompositionEvidence({ bundle, asOf: AS_OF });
  const cid = constructIdOf(family.targetKey);
  const normNotes: string[] = [];
  const naturalStatus = cid ? constructOf(resolution, cid).status : null;

  resolution = normalizeBaseline(resolution, family.targetKey, family.engine, normNotes);

  let patched = false;
  if (cid) {
    const declared = family.resolverStatus;
    const current = constructOf(resolution, cid).status;
    let target: BodyCompositionResolverConstructStatus | null = null;
    if (m.mode === "status_only" && m.forceStatus) {
      target = m.forceStatus;
    } else if (m.forceStatus) {
      // observation-driven rows: patch only if the natural status differs
      const equivalent =
        current === m.forceStatus || (RESOLVED_CLASS.has(current) && RESOLVED_CLASS.has(m.forceStatus));
      if (!equivalent) target = m.forceStatus;
    } else if (declared === "resolved" || declared === "resolved_with_supporting") {
      if (!RESOLVED_CLASS.has(current)) target = "resolved";
    }
    if (target && target !== current) {
      resolution = forceConstructStatus(resolution, cid, target);
      patched = true;
    }
  }

  let scoreBundle = bundle;
  if (m.post) {
    scoreBundle = clone(bundle);
    m.post(scoreBundle);
  }

  const health =
    family.engine === "Health"
      ? scoreHealthComposition({ bundle: scoreBundle, resolution, asOf: AS_OF })
      : null;
  const perf =
    family.engine === "Performance"
      ? scorePerformanceSupportingComposition({ bundle: scoreBundle, resolution, asOf: AS_OF })
      : null;
  const result = (health ?? perf)!;

  let observedAvailability: string;
  let observedPrimaryReason: string | null;
  if (cid) {
    const cs = (result.constructScores as Record<string, { value: number | null; primaryReason: string | null }>)[
      cid
    ] as { value: number | null; primaryReason: string | null };
    observedAvailability = cs.value != null ? "available" : "unavailable";
    observedPrimaryReason = cs.primaryReason;
  } else {
    observedAvailability = result.status === "unavailable" ? "unavailable" : "available";
    observedPrimaryReason = result.primaryReason;
  }

  const structuralPass =
    observedAvailability === family.expectedAvailability &&
    observedPrimaryReason === family.expectedPrimaryReason;

  return {
    ...common,
    observedAvailability,
    observedPrimaryReason,
    executionMode: m.mode,
    structuralPass,
    conflictDelta:
      family.resolverStatus === "conflict" && baseline != null ? conflictDelta(baseline, EPS_SURF) : null,
    resolverStatusObservedNatural: naturalStatus,
    resolverStatusPatched: patched,
    resolverStatusPatchReason: patched
      ? m.mode === "status_only"
        ? "status_only_fixture"
        : "natural_resolver_status_differs_from_declared"
      : null,
    baselineNormalization: normNotes,
    targetPrimaryEvidenceRefs: cid ? [...constructOf(resolution, cid).primaryEvidenceRefs] : [],
    aggregateStatus: result.status,
    aggregatePrimaryReason: result.primaryReason,
  };
}

export type Bcv015Summary = {
  familyCount: number;
  executableFamilyCount: number;
  notApplicableFamilyCount: number;
  instanceRows: number;
  executedInstances: number;
  notApplicableInstances: number;
  structuralPass: number;
  structuralFail: number;
  failingInstanceIds: string[];
  statusPatchedInstances: number;
  statusPatchedInstanceIds: string[];
  baselineNormalizedInstances: number;
  executionModeCounts: Record<string, number>;
};

export function runBcv015(opts: { personaIds?: readonly string[] } = {}): {
  rows: FixtureRow[];
  summary: Bcv015Summary;
} {
  const rows: FixtureRow[] = [];
  const personaIds = opts.personaIds ?? ["P-01", "P-11"];
  for (const family of BCV015_MATRIX) {
    for (const pid of personaIds) rows.push(runFixtureInstance(family, pid));
  }
  const executed = rows.filter((r) => r.executable);
  const failing = executed.filter((r) => r.structuralPass === false);
  const patched = executed.filter((r) => r.resolverStatusPatched);
  const modeCounts: Record<string, number> = {};
  for (const r of rows) modeCounts[r.executionMode] = (modeCounts[r.executionMode] ?? 0) + 1;
  return {
    rows,
    summary: {
      familyCount: BCV015_MATRIX.length,
      executableFamilyCount: BCV015_MATRIX.filter((f) => f.executable).length,
      notApplicableFamilyCount: BCV015_MATRIX.filter((f) => !f.executable).length,
      instanceRows: rows.length,
      executedInstances: executed.length,
      notApplicableInstances: rows.length - executed.length,
      structuralPass: executed.filter((r) => r.structuralPass === true).length,
      structuralFail: failing.length,
      failingInstanceIds: failing.map((r) => r.fixtureInstanceId),
      statusPatchedInstances: patched.length,
      statusPatchedInstanceIds: patched.map((r) => r.fixtureInstanceId),
      baselineNormalizedInstances: executed.filter((r) => r.baselineNormalization.length > 0).length,
      executionModeCounts: modeCounts,
    },
  };
}
