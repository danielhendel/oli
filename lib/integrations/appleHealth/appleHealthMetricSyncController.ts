/**
 * Controllers for Apple Health per-metric Oli sync scope.
 * Pure orchestration over AsyncStorage — no HealthKit I/O here.
 */

import {
  APPLE_HEALTH_METRIC_SYNC_REGISTRY,
  listAppleHealthMetricsForDomain,
  type AppleHealthMetricSyncId,
} from "@/lib/integrations/appleHealth/appleHealthMetricSyncScope";
import {
  enableAppleHealthDomain,
  getAppleHealthDomainScopes,
  getAppleHealthMetricSyncScopes,
  isAppleHealthDomainEnabled,
  isAppleHealthMetricSyncEnabled,
  setAppleHealthDomainScopes,
  setAppleHealthMetricSyncScopes,
  type AppleHealthDomainScopeId,
  type AppleHealthMetricSyncScopesV1,
} from "@/lib/integrations/appleHealth/storage";

export type BodyMetricSyncFlags = {
  weight: boolean;
  bodyFat: boolean;
  leanTissue: boolean;
};

export async function resolveBodyMetricSyncFlags(uid: string): Promise<BodyMetricSyncFlags> {
  const [weight, bodyFat, leanTissue] = await Promise.all([
    isAppleHealthMetricSyncEnabled(uid, "weight", "body"),
    isAppleHealthMetricSyncEnabled(uid, "bodyFat", "body"),
    isAppleHealthMetricSyncEnabled(uid, "leanTissue", "body"),
  ]);
  return { weight, bodyFat, leanTissue };
}

async function materializeMetricScopes(
  uid: string,
): Promise<AppleHealthMetricSyncScopesV1> {
  const existing = await getAppleHealthMetricSyncScopes(uid).catch(() => null);
  if (existing) return existing;
  const metrics: Partial<Record<string, boolean>> = {};
  for (const def of APPLE_HEALTH_METRIC_SYNC_REGISTRY) {
    const domainOn = await isAppleHealthDomainEnabled(def.domain).catch(() => false);
    metrics[def.id] = domainOn;
  }
  const next: AppleHealthMetricSyncScopesV1 = { version: 1, metrics };
  await setAppleHealthMetricSyncScopes(uid, next);
  return next;
}

/**
 * Set one metric's Oli sync scope. Updates domain enablement when all metrics
 * in a domain become OFF or when the first metric turns ON.
 */
export async function setAppleHealthMetricSyncEnabled(opts: {
  uid: string;
  metricId: AppleHealthMetricSyncId;
  enabled: boolean;
}): Promise<{ ok: true } | { ok: false; reason: "no_uid" }> {
  const { uid, metricId, enabled } = opts;
  if (!uid) return { ok: false, reason: "no_uid" };

  const def = APPLE_HEALTH_METRIC_SYNC_REGISTRY.find((m) => m.id === metricId);
  if (!def) return { ok: false, reason: "no_uid" };

  const scopes = await materializeMetricScopes(uid);
  const metrics = { ...scopes.metrics, [metricId]: enabled };
  await setAppleHealthMetricSyncScopes(uid, { version: 1, metrics });

  const domainMetrics = listAppleHealthMetricsForDomain(def.domain);
  const anyOn = domainMetrics.some((m) => metrics[m.id] === true);

  if (enabled) {
    await enableAppleHealthDomain(def.domain).catch(() => undefined);
  } else if (!anyOn) {
    const domainScopes = (await getAppleHealthDomainScopes().catch(() => null)) ?? {
      version: 1 as const,
    };
    await setAppleHealthDomainScopes({
      ...domainScopes,
      version: 1,
      [def.domain]: false,
    }).catch(() => undefined);
  }

  return { ok: true };
}

/** Enable every metric in a domain (e.g. after Body connect). */
export async function enableAllMetricsForDomain(
  uid: string,
  domain: AppleHealthDomainScopeId,
): Promise<void> {
  if (!uid) return;
  const scopes = await materializeMetricScopes(uid);
  const metrics = { ...scopes.metrics };
  for (const m of listAppleHealthMetricsForDomain(domain)) {
    metrics[m.id] = true;
  }
  await setAppleHealthMetricSyncScopes(uid, { version: 1, metrics });
  await enableAppleHealthDomain(domain).catch(() => undefined);
}

/** Enable every implemented metric (Settings → Connect all). */
export async function enableAllAppleHealthMetricSyncScopes(uid: string): Promise<void> {
  if (!uid) return;
  const metrics: Partial<Record<string, boolean>> = {};
  for (const def of APPLE_HEALTH_METRIC_SYNC_REGISTRY) {
    metrics[def.id] = true;
  }
  await setAppleHealthMetricSyncScopes(uid, { version: 1, metrics });
}

export async function resolveMetricSyncMap(
  uid: string,
): Promise<Record<AppleHealthMetricSyncId, boolean>> {
  const out = {} as Record<AppleHealthMetricSyncId, boolean>;
  await Promise.all(
    APPLE_HEALTH_METRIC_SYNC_REGISTRY.map(async (def) => {
      out[def.id] = await isAppleHealthMetricSyncEnabled(uid, def.id, def.domain);
    }),
  );
  return out;
}
