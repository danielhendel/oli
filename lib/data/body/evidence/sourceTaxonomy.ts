/**
 * Source system vs measurement method taxonomy for Body Composition evidence.
 */

import type {
  BodyCompositionMeasurementMethod,
  BodyCompositionSourceSystem,
} from "@oli/contracts";

import { isAppleHealthBodyReadSourceId } from "@oli/contracts";

export function resolveBodyCompositionSourceSystem(
  providerOrSourceId: string | null | undefined,
): BodyCompositionSourceSystem {
  if (!providerOrSourceId) return "unknown";
  const raw = providerOrSourceId.trim().toLowerCase();
  if (isAppleHealthBodyReadSourceId(raw) || raw === "apple_health" || raw === "healthkit") {
    return "apple_health";
  }
  if (raw === "withings") return "withings";
  if (raw === "manual" || raw === "manual_body") return "manual";
  if (raw === "body_scan" || raw === "dxa" || raw.includes("scan")) return "body_scan";
  if (raw === "imported_document" || raw === "document") return "imported_document";
  return "unknown";
}

/**
 * Parse an explicit free-form method label into a governed measurement method.
 * Returns null when no usable explicit method is present.
 */
export function parseExplicitMeasurementMethod(
  explicitMethod: string | null | undefined,
): BodyCompositionMeasurementMethod | null {
  if (explicitMethod == null) return null;
  const explicit = explicitMethod.trim().toLowerCase();
  if (!explicit) return null;
  if (explicit === "unknown") return "unknown";
  if (explicit.includes("dxa") || explicit.includes("dexa")) return "dxa";
  if (explicit.includes("bia") && explicit.includes("segment")) return "segmental_bia";
  if (explicit.includes("bia") || explicit === "consumer_bia") return "consumer_bia";
  if (explicit.includes("air") || explicit.includes("bodpod")) return "air_displacement";
  if (explicit.includes("scale") || explicit === "scale_weight") return "scale_weight";
  if (explicit.includes("manual") || explicit.includes("anthropometr")) {
    return "manual_anthropometry";
  }
  if (explicit === "other") return "other";
  // Unrecognized explicit label — fail closed.
  return "unknown";
}

/**
 * Resolve measurement method from source system + optional explicit method.
 *
 * Apple Health is a transport/source system only. Unlabeled Apple Health
 * composition must NOT be hard-coded as consumer_bia.
 *
 * Withings composition may map to consumer_bia as a separate product branch.
 */
export function resolveContinuousMeasurementMethod(args: {
  sourceSystem: BodyCompositionSourceSystem;
  metric: "body_mass" | "fat_percent" | "lean_mass" | "waist_circumference";
  explicitMethod?: string | null;
}): BodyCompositionMeasurementMethod {
  const fromExplicit = parseExplicitMeasurementMethod(args.explicitMethod);
  if (fromExplicit != null) return fromExplicit;

  if (args.metric === "waist_circumference") {
    if (args.sourceSystem === "manual") return "manual_anthropometry";
    return "unknown";
  }

  if (args.sourceSystem === "manual") {
    if (args.metric === "body_mass") return "scale_weight";
    return "unknown";
  }

  // Apple Health transport: weight may remain scale_weight; composition stays unknown.
  if (args.sourceSystem === "apple_health") {
    if (args.metric === "body_mass") return "scale_weight";
    if (args.metric === "fat_percent" || args.metric === "lean_mass") return "unknown";
    return "unknown";
  }

  // Withings is a separate governed branch — not shared with Apple Health.
  if (args.sourceSystem === "withings") {
    if (args.metric === "body_mass") return "scale_weight";
    if (args.metric === "fat_percent" || args.metric === "lean_mass") return "consumer_bia";
    return "unknown";
  }

  if (args.sourceSystem === "body_scan") return "dxa";
  return "unknown";
}

export function continuousEvidenceTypeForMetric(args: {
  metric: "body_mass" | "fat_percent" | "lean_mass" | "waist_circumference";
  method: BodyCompositionMeasurementMethod;
}): "measured" | "estimated" {
  if (args.metric === "waist_circumference") {
    return args.method === "manual_anthropometry" ? "measured" : "estimated";
  }
  if (args.metric === "body_mass" && (args.method === "scale_weight" || args.method === "dxa")) {
    return "measured";
  }
  if (args.method === "dxa") return "measured";
  if (args.method === "consumer_bia" || args.method === "segmental_bia") return "estimated";
  if (args.metric === "body_mass") return "measured";
  // Unlabeled / unknown-method continuous composition — fail closed to estimated.
  return "estimated";
}
