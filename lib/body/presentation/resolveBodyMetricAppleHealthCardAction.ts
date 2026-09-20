/**
 * Exhaustive metric-specific Apple Health card/popup status resolver.
 * Source connection and Oli metric sync scope are separate concepts.
 */

import type { BodyMetricConnectionActionKind } from "@/lib/ui/body/BodyMetricSummaryCard";
import type { BodyAppleHealthMetricId } from "@/lib/body/presentation/bodyAppleHealthMetricRegistry";
import { getBodyAppleHealthMetricDefinition } from "@/lib/body/presentation/bodyAppleHealthMetricRegistry";

export type BodyMetricAppleHealthStatusInput = {
  readonly metricId: BodyAppleHealthMetricId;
  /** Account Apple Health source connected (domain/body relationship). */
  readonly sourceConnected: boolean;
  /** Current-account Oli sync scope for this metric. */
  readonly metricScopeOn: boolean;
  /** False until UID scopes load — fail closed (do not assume ON). */
  readonly scopesLoaded: boolean;
  readonly connecting: boolean;
  /** Genuine setup/integration failure only. */
  readonly needsAttention: boolean;
};

export type BodyMetricAppleHealthStatus = {
  readonly kind: BodyMetricConnectionActionKind | "sync_off";
  readonly label: string;
  readonly chipLabel: string;
  readonly accessibilityLabel: string;
};

/**
 * Resolve card footer + popup chip for one Body metric.
 */
export function resolveBodyMetricAppleHealthCardAction(
  input: BodyMetricAppleHealthStatusInput,
): BodyMetricAppleHealthStatus {
  const def = getBodyAppleHealthMetricDefinition(input.metricId);

  if (input.connecting) {
    return {
      kind: "syncing",
      label: "Connecting…",
      chipLabel: "Connecting…",
      accessibilityLabel: `Connecting ${def.cardTitle} to Apple Health`,
    };
  }

  if (input.needsAttention) {
    return {
      kind: "review_access",
      label: "Needs attention",
      chipLabel: "Needs attention",
      accessibilityLabel: `Apple Health ${def.cardTitle} needs attention`,
    };
  }

  if (!input.sourceConnected) {
    return {
      kind: "sync_now",
      label: "Sync now",
      chipLabel: "Not Connected",
      accessibilityLabel: `Connect ${def.cardTitle} to Apple Health`,
    };
  }

  // Source connected — fail closed until scopes load.
  const scopeOn = input.scopesLoaded && input.metricScopeOn === true;
  if (!scopeOn) {
    return {
      kind: "sync_off",
      label: "Sync off",
      chipLabel: "Sync Off",
      accessibilityLabel: `Apple Health ${def.cardTitle} sync is off`,
    };
  }

  return {
    kind: "connected",
    label: "Connected",
    chipLabel: "Connected",
    accessibilityLabel: `Apple Health connected for ${def.cardTitle}`,
  };
}

export function resolveBodyMetricHistoryLabel(opts: {
  metricScopeOn: boolean;
  domainBackfillStatus: "not_started" | "in_progress" | "completed" | "failed" | null;
}): string {
  if (!opts.metricScopeOn) return "Off";
  if (opts.domainBackfillStatus === "in_progress") return "Importing";
  if (opts.domainBackfillStatus === "failed") return "Incomplete";
  if (opts.domainBackfillStatus === "completed") return "Up to date";
  return "Not yet";
}
