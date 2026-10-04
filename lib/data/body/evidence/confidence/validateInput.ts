/**
 * Assessment Confidence input consistency validation.
 * Fail closed — never silently upgrade malformed inputs.
 */

import type {
  BodyCompositionConfidenceRationaleCode,
  BodyCompositionEvidenceBundle,
  BodyCompositionEvidenceResolution,
} from "@oli/contracts";
import {
  BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
  BODY_COMPOSITION_RESOLVER_VERSION,
  bodyCompositionEvidenceBundleSchema,
  bodyCompositionEvidenceResolutionSchema,
} from "@oli/contracts";

import { isSupportedConfidenceVersion } from "./policy";

export type ConfidenceInputValidation =
  | {
      ok: true;
      bundle: BodyCompositionEvidenceBundle;
      resolution: BodyCompositionEvidenceResolution;
      asOf: string;
      confidenceVersion: typeof BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION;
    }
  | {
      ok: false;
      reasonCodes: BodyCompositionConfidenceRationaleCode[];
      safeNotes: string[];
      asOf: string;
    };

function parseAsOf(asOf: string): string | null {
  const ms = Date.parse(asOf);
  if (!Number.isFinite(ms)) return null;
  // Require datetime-parseable ISO; schema later enforces .datetime().
  try {
    return new Date(ms).toISOString();
  } catch {
    return null;
  }
}

export function validateConfidenceInput(args: {
  bundle: unknown;
  resolution: unknown;
  asOf: string;
  confidenceVersion?: string;
  resolverVersion?: string;
}): ConfidenceInputValidation {
  const safeNotes: string[] = [];
  const reasonCodes: BodyCompositionConfidenceRationaleCode[] = [];

  const confidenceVersion = args.confidenceVersion ?? BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION;
  if (!isSupportedConfidenceVersion(confidenceVersion)) {
    reasonCodes.push("unsupported_confidence_version");
    safeNotes.push("unsupported_confidence_version");
    return {
      ok: false,
      reasonCodes,
      safeNotes,
      asOf: "1970-01-01T00:00:00.000Z",
    };
  }

  const asOfNormalized = parseAsOf(args.asOf);
  if (asOfNormalized == null) {
    reasonCodes.push("as_of_invalid");
    safeNotes.push("as_of_invalid");
    return {
      ok: false,
      reasonCodes,
      safeNotes,
      asOf: "1970-01-01T00:00:00.000Z",
    };
  }

  const bundleParsed = bodyCompositionEvidenceBundleSchema.safeParse(args.bundle);
  if (!bundleParsed.success) {
    reasonCodes.push("bundle_schema_invalid");
    safeNotes.push("bundle_schema_invalid");
    return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
  }

  const resolutionParsed = bodyCompositionEvidenceResolutionSchema.safeParse(args.resolution);
  if (!resolutionParsed.success) {
    reasonCodes.push("resolution_schema_invalid");
    safeNotes.push("resolution_schema_invalid");
    return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
  }

  const bundle = bundleParsed.data;
  const resolution = resolutionParsed.data;

  const expectedResolverVersion = args.resolverVersion ?? BODY_COMPOSITION_RESOLVER_VERSION;
  if (
    resolution.resolverVersion !== BODY_COMPOSITION_RESOLVER_VERSION ||
    expectedResolverVersion !== BODY_COMPOSITION_RESOLVER_VERSION
  ) {
    reasonCodes.push("unsupported_resolver_version");
    safeNotes.push("unsupported_resolver_version");
    return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
  }

  if (resolution.asOf !== asOfNormalized && resolution.asOf !== args.asOf) {
    // Allow exact match on caller asOf or normalized ISO form.
    const resolutionMs = Date.parse(resolution.asOf);
    const callerMs = Date.parse(asOfNormalized);
    if (!Number.isFinite(resolutionMs) || resolutionMs !== callerMs) {
      reasonCodes.push("as_of_mismatch");
      safeNotes.push("as_of_mismatch");
      return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
    }
  }

  if (
    resolution.evidenceBundleCompleteness.mode !== bundle.completeness.mode ||
    resolution.evidenceBundleCompleteness.mode !== "caller_supplied_partial"
  ) {
    reasonCodes.push("completeness_mismatch");
    safeNotes.push("completeness_mismatch");
    return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
  }

  const constructIds = resolution.constructs.map((c) => c.constructId);
  const uniqueIds = new Set(constructIds);
  if (uniqueIds.size !== constructIds.length) {
    reasonCodes.push("duplicate_construct_result");
    safeNotes.push("duplicate_construct_result");
    return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
  }

  const expected = ["H1", "H2", "H3", "H4", "P1", "P2", "P3"];
  for (const id of constructIds) {
    if (!expected.includes(id)) {
      reasonCodes.push("unknown_construct");
      safeNotes.push("unknown_construct");
      return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
    }
  }

  const observationIds = new Set(bundle.observations.map((o) => o.observationId));
  for (const construct of resolution.constructs) {
    const refs = [
      ...construct.primaryEvidenceRefs,
      ...construct.supportingEvidenceRefs,
      ...construct.alternateEvidenceRefs,
    ];
    for (const ref of refs) {
      if (!observationIds.has(ref)) {
        reasonCodes.push("dangling_resolver_observation_ref");
        safeNotes.push("dangling_resolver_observation_ref");
        return { ok: false, reasonCodes, safeNotes, asOf: asOfNormalized };
      }
    }
  }

  return {
    ok: true,
    bundle,
    resolution,
    asOf: resolution.asOf,
    confidenceVersion: BODY_COMPOSITION_ASSESSMENT_CONFIDENCE_VERSION,
  };
}
