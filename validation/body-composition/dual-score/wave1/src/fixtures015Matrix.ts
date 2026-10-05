/**
 * BCV-015 complete fixture-family matrix — plan §23.17.4.8 (81 families).
 *
 *   80 executable families + 1 `not_applicable` (H1_MISSING_SEX: listed, MUST NOT execute).
 *   Each executable family is instantiated for P-01 and P-11 ⇒ 160 runnable instances
 *   (+ 2 not_applicable instances listed) = 162 rows.
 *
 * Fixture IDs are Wave-1 artifact identity and are emitted UNCHANGED.
 */

export type Fixture015Engine = "Health" | "Performance";
export type Fixture015Construct = "H1" | "H2" | "H3" | "P1" | "P3" | "AGGREGATE";
export type Fixture015Channel = "whtr_v1" | "fmi_v1" | "almi_v1" | "ffmi_v1" | "n/a";

export type ResolverStatus015 =
  | "resolved"
  | "resolved_with_supporting"
  | "multiple_valid"
  | "policy_not_frozen"
  | "conflict"
  | "insufficient"
  | "undated_only"
  | "unsupported"
  | "not_applicable";

export type MissingnessMutation =
  | "none"
  | "MISSING_VALUE"
  | "MISSING_MEASURED_AT"
  | "MISSING_REQUIRED_METHOD";

export type DemographicMutation = "none" | "MISSING_SEX" | "MISSING_HEIGHT" | "MISSING_DOB";

export type FixtureFamily = {
  fixtureId: string;
  baselinePersonaIds: readonly ["P-01", "P-11"];
  engine: Fixture015Engine;
  targetConstruct: Fixture015Construct;
  targetChannel: Fixture015Channel;
  /** Key used for baseline assembly and mutation: H1 | H2 | H3_ALMI | H3_FFMI | P1 | P3 | AGGREGATE */
  targetKey: "H1" | "H2" | "H3_ALMI" | "H3_FFMI" | "P1" | "P3" | "AGGREGATE";
  resolverStatus: ResolverStatus015;
  mutationType: MissingnessMutation;
  demographicMutation: DemographicMutation;
  candidateCount: number | null;
  candidateRelationship: string;
  measuredAtState: string;
  methodState: string;
  expectedAvailability: "available" | "unavailable" | "not_applicable";
  expectedPrimaryReason: string | null;
  executable: boolean;
  notes: string;
};

type Target = {
  prefix: string;
  engine: Fixture015Engine;
  construct: "H1" | "H2" | "H3" | "P1" | "P3";
  channel: Fixture015Channel;
  key: FixtureFamily["targetKey"];
  unsupportedMethod: string;
};

const TARGETS: readonly Target[] = [
  { prefix: "H1", engine: "Health", construct: "H1", channel: "whtr_v1", key: "H1", unsupportedMethod: "unknown_waist_protocol" },
  { prefix: "H2", engine: "Health", construct: "H2", channel: "fmi_v1", key: "H2", unsupportedMethod: "consumer_bia" },
  { prefix: "H3_ALMI", engine: "Health", construct: "H3", channel: "almi_v1", key: "H3_ALMI", unsupportedMethod: "consumer_bia" },
  { prefix: "H3_FFMI", engine: "Health", construct: "H3", channel: "ffmi_v1", key: "H3_FFMI", unsupportedMethod: "consumer_bia" },
  { prefix: "P1", engine: "Performance", construct: "P1", channel: "ffmi_v1", key: "P1", unsupportedMethod: "consumer_bia" },
  { prefix: "P3", engine: "Performance", construct: "P3", channel: "fmi_v1", key: "P3", unsupportedMethod: "consumer_bia" },
];

const PERSONAS = ["P-01", "P-11"] as const;

function base(t: Target): Omit<
  FixtureFamily,
  | "fixtureId"
  | "resolverStatus"
  | "mutationType"
  | "demographicMutation"
  | "candidateCount"
  | "candidateRelationship"
  | "measuredAtState"
  | "methodState"
  | "expectedAvailability"
  | "expectedPrimaryReason"
  | "notes"
> {
  return {
    baselinePersonaIds: PERSONAS,
    engine: t.engine,
    targetConstruct: t.construct,
    targetChannel: t.channel,
    targetKey: t.key,
    executable: true,
  };
}

function buildMatrix(): FixtureFamily[] {
  const rows: FixtureFamily[] = [];
  for (const t of TARGETS) {
    const b = base(t);
    const p = t.prefix;
    const sup = t.unsupportedMethod;

    rows.push({
      ...b,
      fixtureId: `${p}_RESOLVED`,
      resolverStatus: "resolved",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 1,
      candidateRelationship: "single_governed_primary",
      measuredAtState: "valid",
      methodState: "governed",
      expectedAvailability: "available",
      expectedPrimaryReason: null,
      notes: "primaryEvidenceRef required",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_RESOLVED_WITH_SUPPORTING`,
      resolverStatus: "resolved_with_supporting",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 2,
      candidateRelationship: "primary_plus_supporting_same_value",
      measuredAtState: "valid",
      methodState: "governed",
      expectedAvailability: "available",
      expectedPrimaryReason: null,
      notes: "supporting distinct sourceEventId",
    });
    if (t.key === "H1") {
      rows.push({
        ...b,
        fixtureId: "H1_MULTIPLE_VALID_NO_GOVERNED_WHTR",
        resolverStatus: "multiple_valid",
        mutationType: "none",
        demographicMutation: "none",
        candidateCount: 2,
        candidateRelationship: "two_non_whtr_valid_candidates",
        measuredAtState: "valid",
        methodState: "dxa_vat_non_scoring",
        expectedAvailability: "unavailable",
        expectedPrimaryReason: "multiple_valid_unfrozen",
        notes: "general fail-closed; no governed whtr_v1",
      });
      rows.push({
        ...b,
        fixtureId: "H1_MULTIPLE_VALID_GOVERNED_WHTR",
        resolverStatus: "multiple_valid",
        mutationType: "none",
        demographicMutation: "none",
        candidateCount: 2,
        candidateRelationship: "governed_whtr_plus_vat_mass_non_scoring",
        measuredAtState: "valid",
        methodState: "whtr_v1_plus_vat",
        expectedAvailability: "available",
        expectedPrimaryReason: null,
        notes: "Mathematical Truth Freeze §10.2 exception",
      });
    } else {
      rows.push({
        ...b,
        fixtureId: `${p}_MULTIPLE_VALID`,
        resolverStatus: "multiple_valid",
        mutationType: "none",
        demographicMutation: "none",
        candidateCount: 2,
        candidateRelationship: "two_same_value_different_sourceEventId",
        measuredAtState: "valid",
        methodState: "governed",
        expectedAvailability: "unavailable",
        expectedPrimaryReason: "multiple_valid_unfrozen",
        notes: "no score-layer winner",
      });
    }
    rows.push({
      ...b,
      fixtureId: `${p}_POLICY_NOT_FROZEN`,
      resolverStatus: "policy_not_frozen",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 0,
      candidateRelationship: "status_only",
      measuredAtState: "n/a",
      methodState: "n/a",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "policy_not_frozen",
      notes: "do not repair downstream",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_CONFLICT_VALUE_DISAGREEMENT`,
      resolverStatus: "conflict",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 2,
      candidateRelationship: "value_disagreement_same_channel",
      measuredAtState: "valid_same",
      methodState: "governed_same",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "conflict_unresolved",
      notes: "values=baseline±conflictDelta",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_INSUFFICIENT`,
      resolverStatus: "insufficient",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 0,
      candidateRelationship: "no_governed_numeric_channel",
      measuredAtState: "n/a",
      methodState: "n/a",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "unresolved_construct",
      notes: "",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_UNDATED_ONLY`,
      resolverStatus: "undated_only",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 1,
      candidateRelationship: "value_present_measuredAt_absent",
      measuredAtState: "absent",
      methodState: "governed",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "invalid_provenance",
      notes: "",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_UNSUPPORTED`,
      resolverStatus: "unsupported",
      mutationType: "none",
      demographicMutation: "none",
      candidateCount: 1,
      candidateRelationship: "unsupported_method_observation",
      measuredAtState: "valid",
      methodState: sup,
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "unsupported_method",
      notes: sup,
    });
  }
  for (const t of TARGETS) {
    const b = base(t);
    const p = t.prefix;
    rows.push({
      ...b,
      fixtureId: `${p}_MISSING_VALUE`,
      resolverStatus: "resolved",
      mutationType: "MISSING_VALUE",
      demographicMutation: "none",
      candidateCount: 1,
      candidateRelationship: "single_governed_primary",
      measuredAtState: "valid",
      methodState: "governed",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "invalid_provenance",
      notes: "numeric removed only",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_MISSING_MEASURED_AT`,
      resolverStatus: "resolved",
      mutationType: "MISSING_MEASURED_AT",
      demographicMutation: "none",
      candidateCount: 1,
      candidateRelationship: "single_governed_primary",
      measuredAtState: "absent",
      methodState: "governed",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "invalid_provenance",
      notes: "value retained",
    });
    rows.push({
      ...b,
      fixtureId: `${p}_MISSING_REQUIRED_METHOD`,
      resolverStatus: "resolved",
      mutationType: "MISSING_REQUIRED_METHOD",
      demographicMutation: "none",
      candidateCount: 1,
      candidateRelationship: "single_governed_primary",
      measuredAtState: "valid",
      methodState: t.unsupportedMethod,
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "unsupported_method",
      notes: t.unsupportedMethod,
    });
    rows.push({
      ...b,
      fixtureId: `${p}_MISSING_HEIGHT`,
      resolverStatus: "resolved",
      mutationType: "none",
      demographicMutation: "MISSING_HEIGHT",
      candidateCount: 1,
      candidateRelationship: "single_governed_primary",
      measuredAtState: "valid",
      methodState: "governed",
      expectedAvailability: "unavailable",
      expectedPrimaryReason: "required_height_missing",
      notes: "Height required for WHtR/FMI/FFMI/ALMI",
    });
    if (t.key !== "H1") {
      rows.push({
        ...b,
        fixtureId: `${p}_MISSING_SEX`,
        resolverStatus: "resolved",
        mutationType: "none",
        demographicMutation: "MISSING_SEX",
        candidateCount: 1,
        candidateRelationship: "single_governed_primary",
        measuredAtState: "valid",
        methodState: "governed",
        expectedAvailability: "unavailable",
        expectedPrimaryReason: "required_sex_missing",
        notes: "H1 excluded",
      });
    }
  }
  // H1_MISSING_SEX — not_applicable (listed, MUST NOT execute)
  rows.push({
    baselinePersonaIds: PERSONAS,
    engine: "Health",
    targetConstruct: "H1",
    targetChannel: "whtr_v1",
    targetKey: "H1",
    fixtureId: "H1_MISSING_SEX",
    resolverStatus: "not_applicable",
    mutationType: "none",
    demographicMutation: "MISSING_SEX",
    candidateCount: 0,
    candidateRelationship: "not_applicable",
    measuredAtState: "n/a",
    methodState: "n/a",
    expectedAvailability: "not_applicable",
    expectedPrimaryReason: null,
    executable: false,
    notes: "MUST NOT execute — H1 sex-independent",
  });
  rows.push({
    baselinePersonaIds: PERSONAS,
    engine: "Health",
    targetConstruct: "AGGREGATE",
    targetChannel: "n/a",
    targetKey: "AGGREGATE",
    fixtureId: "HEALTH_MISSING_DOB",
    resolverStatus: "resolved",
    mutationType: "none",
    demographicMutation: "MISSING_DOB",
    candidateCount: null,
    candidateRelationship: "engine_dob_removed",
    measuredAtState: "valid",
    methodState: "governed",
    expectedAvailability: "unavailable",
    expectedPrimaryReason: "required_age_missing",
    executable: true,
    notes: "construct inputs otherwise valid",
  });
  rows.push({
    baselinePersonaIds: PERSONAS,
    engine: "Performance",
    targetConstruct: "AGGREGATE",
    targetChannel: "n/a",
    targetKey: "AGGREGATE",
    fixtureId: "PERF_MISSING_DOB",
    resolverStatus: "resolved",
    mutationType: "none",
    demographicMutation: "MISSING_DOB",
    candidateCount: null,
    candidateRelationship: "engine_dob_removed",
    measuredAtState: "valid",
    methodState: "governed",
    expectedAvailability: "unavailable",
    expectedPrimaryReason: "required_age_missing",
    executable: true,
    notes: "construct inputs otherwise valid",
  });
  return rows;
}

export const BCV015_MATRIX: readonly FixtureFamily[] = buildMatrix();

export const BCV015_FAMILY_COUNT = 81;
export const BCV015_EXECUTABLE_FAMILY_COUNT = 80;
export const BCV015_BASELINE_PERSONAS = ["P-01", "P-11"] as const;
export const BCV015_RUNNABLE_INSTANCE_COUNT = 160;
export const BCV015_NOT_APPLICABLE_INSTANCE_COUNT = 2;

/**
 * §23.17.4.3: conflictDelta = max(EPS_SURF, 0.10*abs(baselineValue)); baselineValue == 0 → EPS_SURF.
 */
export function conflictDelta(baselineValue: number, epsSurf = 1e-4): number {
  if (baselineValue === 0) return epsSurf;
  return Math.max(epsSurf, 0.1 * Math.abs(baselineValue));
}
