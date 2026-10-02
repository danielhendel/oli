/**
 * Body Scan category presentation catalog (Stage 3E navigation).
 *
 * Product navigation categories are separate from scientific method.
 * InBody/Evolt remain method=bia; Bod Pod remains method=air_displacement.
 */
import type { BodyScanMethod, BodyScanType } from "@oli/contracts";

export type BodyScanCategoryProductStatus = "available" | "manual_review";

export type BodyScanCategoryDefinition = {
  readonly type: BodyScanType;
  readonly label: string;
  readonly historyTitle: string;
  readonly emptyTitle: string;
  readonly emptyBody: string;
  readonly addLabel: string;
  readonly sortOrder: number;
  /** Typical governed method for this product category — not a second method registry. */
  readonly associatedMethod: BodyScanMethod;
  readonly productStatus: BodyScanCategoryProductStatus;
  readonly accessibilityHint: string;
};

/**
 * Stable landing / hub order. Never reordered by date, count, status, or parser support.
 */
export const BODY_SCAN_CATEGORY_DEFINITIONS: readonly BodyScanCategoryDefinition[] = [
  {
    type: "dxa",
    label: "DXA",
    historyTitle: "DXA Scans",
    emptyTitle: "No DXA scans yet",
    emptyBody: "Upload a DXA report to keep its results and history together.",
    addLabel: "Add DXA scan",
    sortOrder: 1,
    associatedMethod: "dxa",
    productStatus: "available",
    accessibilityHint: "Opens DXA scan history.",
  },
  {
    type: "inbody",
    label: "InBody",
    historyTitle: "InBody Scans",
    emptyTitle: "No InBody scans yet",
    emptyBody: "Upload an InBody report to keep its results and history together.",
    addLabel: "Add InBody scan",
    sortOrder: 2,
    associatedMethod: "bia",
    productStatus: "manual_review",
    accessibilityHint: "Opens InBody scan history.",
  },
  {
    type: "evolt",
    label: "Evolt",
    historyTitle: "Evolt Scans",
    emptyTitle: "No Evolt scans yet",
    emptyBody: "Upload an Evolt report to keep its results and history together.",
    addLabel: "Add Evolt scan",
    sortOrder: 3,
    associatedMethod: "bia",
    productStatus: "manual_review",
    accessibilityHint: "Opens Evolt scan history.",
  },
  {
    type: "bod_pod",
    label: "Bod Pod",
    historyTitle: "Bod Pod Scans",
    emptyTitle: "No Bod Pod scans yet",
    emptyBody: "Upload a Bod Pod report to keep its results and history together.",
    addLabel: "Add Bod Pod scan",
    sortOrder: 4,
    associatedMethod: "air_displacement",
    productStatus: "manual_review",
    accessibilityHint: "Opens Bod Pod scan history.",
  },
  {
    type: "other",
    label: "Other",
    historyTitle: "Other Scans",
    emptyTitle: "No Other scans yet",
    emptyBody: "Upload another scan report to keep its results and history together.",
    addLabel: "Add Other scan",
    sortOrder: 5,
    associatedMethod: "other",
    productStatus: "manual_review",
    accessibilityHint: "Opens Other scan history.",
  },
] as const;

const BY_TYPE: ReadonlyMap<BodyScanType, BodyScanCategoryDefinition> = new Map(
  BODY_SCAN_CATEGORY_DEFINITIONS.map((def) => [def.type, def]),
);

export function bodyScanCategoryDefinition(
  type: BodyScanType,
): BodyScanCategoryDefinition {
  const found = BY_TYPE.get(type);
  if (!found) {
    // Exhaustive catalog — fall closed to Other for any unexpected gap.
    return BY_TYPE.get("other")!;
  }
  return found;
}

export function bodyScanCategoryLabel(type: BodyScanType): string {
  return bodyScanCategoryDefinition(type).label;
}

export function bodyScanCategoryAssociatedMethod(type: BodyScanType): BodyScanMethod {
  return bodyScanCategoryDefinition(type).associatedMethod;
}

export function isBodyScanCategoryType(value: string): value is BodyScanType {
  return BY_TYPE.has(value as BodyScanType);
}

export const BODY_SCAN_CATEGORY_TYPES: readonly BodyScanType[] =
  BODY_SCAN_CATEGORY_DEFINITIONS.map((d) => d.type);
