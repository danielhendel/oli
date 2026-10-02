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
 * Infer measurement method from source system + kind hints.
 * Apple Health is a transport — never treat it as the scientific method alone.
 */
export function resolveContinuousMeasurementMethod(args: {
  sourceSystem: BodyCompositionSourceSystem;
  metric: "body_mass" | "fat_percent" | "lean_mass";
  explicitMethod?: string | null;
}): BodyCompositionMeasurementMethod {
  const explicit = args.explicitMethod?.trim().toLowerCase() ?? "";
  if (explicit.includes("dxa") || explicit.includes("dexa")) return "dxa";
  if (explicit.includes("bia") && explicit.includes("segment")) return "segmental_bia";
  if (explicit.includes("bia")) return "consumer_bia";
  if (explicit.includes("air") || explicit.includes("bodpod")) return "air_displacement";
  if (explicit.includes("scale") || explicit === "scale_weight") return "scale_weight";
  if (explicit.includes("manual") || explicit.includes("anthropometr")) {
    return "manual_anthropometry";
  }

  if (args.sourceSystem === "manual") {
    if (args.metric === "body_mass") return "scale_weight";
    return "unknown";
  }
  if (args.sourceSystem === "apple_health" || args.sourceSystem === "withings") {
    if (args.metric === "body_mass") return "scale_weight";
    // Composition from consumer devices is estimated unless a stronger method is labeled.
    if (args.metric === "fat_percent" || args.metric === "lean_mass") return "consumer_bia";
  }
  if (args.sourceSystem === "body_scan") return "dxa";
  return "unknown";
}

export function continuousEvidenceTypeForMetric(args: {
  metric: "body_mass" | "fat_percent" | "lean_mass";
  method: BodyCompositionMeasurementMethod;
}): "measured" | "estimated" {
  if (args.metric === "body_mass" && (args.method === "scale_weight" || args.method === "dxa")) {
    return "measured";
  }
  if (args.method === "dxa") return "measured";
  if (args.method === "consumer_bia" || args.method === "segmental_bia") return "estimated";
  if (args.metric === "body_mass") return "measured";
  // Unlabeled continuous composition — fail closed to estimated, not measured.
  return "estimated";
}
