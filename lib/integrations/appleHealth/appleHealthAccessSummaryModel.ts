/**
 * Consumer presentation for Settings → Devices → Apple Health access summary.
 * Pure — no I/O. No HealthKit identifiers, no backfill language.
 */

import {
  listImplementedAppleHealthDomains,
  type AppleHealthDomainDefinition,
} from "@/lib/integrations/appleHealth/appleHealthDomainRegistry";
import { formatAppleHealthLastUpdatedLabel } from "@/lib/body/presentation/appleHealthBodyConnectSheetModel";

export type AppleHealthAccessSummaryModel = {
  readonly connected: boolean;
  readonly intro: string;
  readonly dataSections: readonly {
    readonly title: string;
    readonly metricsLine: string;
  }[];
  readonly lastUpdatedLabel: string;
  readonly connectedCategoriesLabel: string;
  readonly showConnectAll: boolean;
};

export function buildAppleHealthAccessSummaryModel(opts: {
  connected: boolean;
  lastSuccessfulSyncAtIso: string | null;
  enabledDomainCount: number | null;
  domains?: readonly AppleHealthDomainDefinition[];
  nowMs?: number;
}): AppleHealthAccessSummaryModel {
  const domains = (opts.domains ?? listImplementedAppleHealthDomains()).filter((d) => d.implemented);
  const enabled =
    typeof opts.enabledDomainCount === "number" && Number.isFinite(opts.enabledDomainCount)
      ? Math.max(0, Math.min(domains.length, opts.enabledDomainCount))
      : opts.connected
        ? domains.length
        : 0;
  return {
    connected: opts.connected,
    intro:
      "Choose which Apple Health data Oli can sync. System permissions stay in Apple Health.",
    dataSections: domains.map((d) => ({
      title: d.displayName,
      metricsLine: d.consumerMetrics.join(", "),
    })),
    lastUpdatedLabel: formatAppleHealthLastUpdatedLabel(
      opts.lastSuccessfulSyncAtIso,
      opts.nowMs ?? Date.now(),
    ),
    connectedCategoriesLabel:
      enabled === 0
        ? "None yet"
        : enabled === domains.length
          ? `All ${domains.length} supported`
          : `${enabled} of ${domains.length}`,
    showConnectAll: !opts.connected,
  };
}
