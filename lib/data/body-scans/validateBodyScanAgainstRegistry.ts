/**
 * Validate adapter candidate / verified metric rows against the registry (Phase B/C).
 *
 * Fail closed for unmapped keys, illegal regions, or illegal units.
 * Does not invent measurements.
 */

import type {
  BodyScanExtractedField,
  BodyScanMethod,
  BodyScanMetric,
  BodyScanMetricId,
  BodyScanRegion,
  BodyScanUnit,
} from "@oli/contracts";

import { bodyScanDxaMayEmit } from "./bodyScanCapabilities";
import {
  BODY_SCAN_METRIC_REGISTRY,
  isMethodAllowedForMetric,
  isRegionAllowedForMetric,
  isUnitCompatibleWithMetric,
} from "./bodyScanMetricRegistry";

export type BodyScanRegistryValidationIssue = {
  code:
    | "unmapped_metric"
    | "invalid_region"
    | "invalid_unit"
    | "method_not_allowed"
    | "dxa_not_emittable";
  metricId?: string;
  region?: string;
  unit?: string;
  fieldId?: string;
};

export type BodyScanRegistryValidationResult = {
  ok: boolean;
  issues: BodyScanRegistryValidationIssue[];
  unmappedMetricCount: number;
  invalidRegionCount: number;
  invalidUnitCount: number;
};

function countBy(
  issues: readonly BodyScanRegistryValidationIssue[],
  code: BodyScanRegistryValidationIssue["code"],
): number {
  return issues.filter((i) => i.code === code).length;
}

function issue(
  partial: BodyScanRegistryValidationIssue,
): BodyScanRegistryValidationIssue {
  return partial;
}

export function validateBodyScanCandidateAgainstRegistry(args: {
  metricId: BodyScanMetricId;
  region: BodyScanRegion;
  unit: BodyScanUnit;
  method: BodyScanMethod;
  fieldId?: string;
  /** When true, also enforce DXA emission capability (no T/Z/SMM). */
  enforceDxaEmit?: boolean;
}): BodyScanRegistryValidationIssue[] {
  const issues: BodyScanRegistryValidationIssue[] = [];
  const def = BODY_SCAN_METRIC_REGISTRY[args.metricId];
  if (!def) {
    issues.push(
      issue({
        code: "unmapped_metric",
        metricId: args.metricId,
        ...(args.fieldId != null ? { fieldId: args.fieldId } : {}),
      }),
    );
    return issues;
  }
  if (!isRegionAllowedForMetric(args.metricId, args.region)) {
    issues.push(
      issue({
        code: "invalid_region",
        metricId: args.metricId,
        region: args.region,
        ...(args.fieldId != null ? { fieldId: args.fieldId } : {}),
      }),
    );
  }
  if (!isUnitCompatibleWithMetric(args.metricId, args.unit) && def.canonicalUnit !== args.unit) {
    issues.push(
      issue({
        code: "invalid_unit",
        metricId: args.metricId,
        unit: args.unit,
        ...(args.fieldId != null ? { fieldId: args.fieldId } : {}),
      }),
    );
  }
  if (!isMethodAllowedForMetric(args.metricId, args.method)) {
    issues.push(
      issue({
        code: "method_not_allowed",
        metricId: args.metricId,
        ...(args.fieldId != null ? { fieldId: args.fieldId } : {}),
      }),
    );
  }
  if (args.enforceDxaEmit === true && args.method === "dxa" && !bodyScanDxaMayEmit(args.metricId)) {
    issues.push(
      issue({
        code: "dxa_not_emittable",
        metricId: args.metricId,
        ...(args.fieldId != null ? { fieldId: args.fieldId } : {}),
      }),
    );
  }
  return issues;
}

export function validateBodyScanExtractedFieldsAgainstRegistry(args: {
  fields: readonly BodyScanExtractedField[];
  method: BodyScanMethod;
  enforceDxaEmit?: boolean;
}): BodyScanRegistryValidationResult {
  const issues: BodyScanRegistryValidationIssue[] = [];
  for (const field of args.fields) {
    issues.push(
      ...validateBodyScanCandidateAgainstRegistry({
        metricId: field.metricId,
        region: field.region,
        unit: field.unit,
        method: args.method,
        fieldId: field.fieldId,
        ...(args.enforceDxaEmit != null ? { enforceDxaEmit: args.enforceDxaEmit } : {}),
      }),
    );
  }
  return {
    ok: issues.length === 0,
    issues,
    unmappedMetricCount: countBy(issues, "unmapped_metric"),
    invalidRegionCount: countBy(issues, "invalid_region"),
    invalidUnitCount: countBy(issues, "invalid_unit"),
  };
}

export function validateBodyScanVerifiedMetricsAgainstRegistry(args: {
  metrics: readonly BodyScanMetric[];
}): BodyScanRegistryValidationResult {
  const issues: BodyScanRegistryValidationIssue[] = [];
  for (const metric of args.metrics) {
    issues.push(
      ...validateBodyScanCandidateAgainstRegistry({
        metricId: metric.metricId,
        region: metric.region,
        unit: metric.unit,
        method: metric.method,
      }),
    );
  }
  return {
    ok: issues.length === 0,
    issues,
    unmappedMetricCount: countBy(issues, "unmapped_metric"),
    invalidRegionCount: countBy(issues, "invalid_region"),
    invalidUnitCount: countBy(issues, "invalid_unit"),
  };
}

/** Drop fields that fail registry validation (fail closed). */
export function filterExtractedFieldsToRegistry(args: {
  fields: readonly BodyScanExtractedField[];
  method: BodyScanMethod;
  enforceDxaEmit?: boolean;
}): {
  fields: BodyScanExtractedField[];
  dropped: BodyScanRegistryValidationIssue[];
} {
  const kept: BodyScanExtractedField[] = [];
  const dropped: BodyScanRegistryValidationIssue[] = [];
  for (const field of args.fields) {
    const issues = validateBodyScanCandidateAgainstRegistry({
      metricId: field.metricId,
      region: field.region,
      unit: field.unit,
      method: args.method,
      fieldId: field.fieldId,
      ...(args.enforceDxaEmit != null ? { enforceDxaEmit: args.enforceDxaEmit } : {}),
    });
    if (issues.length === 0) kept.push(field);
    else dropped.push(...issues);
  }
  return { fields: kept, dropped };
}
