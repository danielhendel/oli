#!/usr/bin/env npx tsx
/**
 * Read-only Labs history identity reconciliation probe (local admin only).
 * Prints structural classification codes — never application telemetry with PHI.
 *
 * Usage:
 *   npx tsx scripts/labs/labs-history-reconciliation-probe.cli.ts \
 *     --uid <uid> --metric total_cholesterol [--document-id <id>]
 */
import { readFileSync } from "node:fs";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function loadEnv(path: string) {
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
}

function log(obj: Record<string, unknown>) {
  console.log(JSON.stringify(obj));
}

type HistoryPoint = {
  id?: string;
  acceptedResultId?: string;
  canonicalMetricId?: string | null;
  collectedAt?: string | null;
  sourceCalendarDate?: string | null;
  result?: { kind?: string; value?: number; comparator?: string };
  rawUnit?: string | null;
  normalizedUnit?: string | null;
  rawReferenceRange?: string | null;
  panelId?: string | null;
  specimenType?: string | null;
  methodId?: string | null;
  sourceDocumentId?: string;
  sourcePage?: number;
  historyPointId?: string;
  trendEligible?: boolean;
  trendEligibility?: string;
};

type PointClass =
  | "valid_metric_identity"
  | "wrong_metric_identity"
  | "duplicate_representation"
  | "stale_generation"
  | "reference_as_result"
  | "malformed_source_row"
  | "unknown";

function classifyPoint(args: {
  metricKey: string;
  point: HistoryPoint;
  seenKeys: Set<string>;
}): PointClass {
  const p = args.point;
  if (!p.collectedAt && !p.sourceCalendarDate) return "malformed_source_row";
  if (!p.canonicalMetricId) return "malformed_source_row";
  if (p.canonicalMetricId !== args.metricKey) return "wrong_metric_identity";

  // Structural suspicion: total_cholesterol with ratio-scale value + ratio-like range.
  if (
    args.metricKey === "total_cholesterol" &&
    p.result?.kind === "numeric" &&
    typeof p.result.value === "number" &&
    p.result.value > 0 &&
    p.result.value < 20 &&
    /calc|<5|ratio/i.test(p.rawReferenceRange ?? "")
  ) {
    return "wrong_metric_identity";
  }

  const key = [
    p.sourceDocumentId ?? "",
    p.sourceCalendarDate ?? p.collectedAt?.slice(0, 10) ?? "",
    p.panelId ?? "",
    p.specimenType ?? "",
    String(p.result?.value ?? ""),
  ].join("|");
  if (args.seenKeys.has(key)) return "duplicate_representation";
  args.seenKeys.add(key);

  if (p.trendEligibility === "table_only" && /reference|threshold/i.test(p.rawReferenceRange ?? "")) {
    return "reference_as_result";
  }

  return "valid_metric_identity";
}

async function main() {
  loadEnv(arg("--env-file") || "/Users/danielhendel/oli/.env.local");
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID!;
  const baseUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL!;
  const gatewayKey = process.env.EXPO_PUBLIC_GATEWAY_API_KEY!;
  const firebaseApiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY!;
  const uid = arg("--uid");
  const metric = arg("--metric") || "total_cholesterol";
  const documentId = arg("--document-id");
  if (!uid) {
    log({ ok: false, error: "UID_REQUIRED" });
    process.exit(2);
  }
  if (!getApps().length) {
    initializeApp({
      projectId,
      serviceAccountId: `oli-api-runtime@${projectId}.iam.gserviceaccount.com`,
    });
  }
  const customToken = await getAuth().createCustomToken(uid);
  const tokRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const tokJson = (await tokRes.json()) as { idToken?: string };
  if (!tokJson.idToken) {
    log({ ok: false, error: "TOKEN_FAILED" });
    process.exit(1);
  }

  const url = new URL(
    `${baseUrl.replace(/\/$/, "")}/users/me/labs/metrics/${encodeURIComponent(metric)}/history`,
  );
  url.searchParams.set("limit", "50");
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "x-api-key": gatewayKey,
      Authorization: `Bearer ${tokJson.idToken}`,
    },
  });
  const json = (await res.json()) as {
    ok?: boolean;
    points?: HistoryPoint[];
    nextCursor?: string | null;
  };
  if (!res.ok || !json.ok || !Array.isArray(json.points)) {
    log({ ok: false, error: "HISTORY_FETCH_FAILED", status: res.status });
    process.exit(1);
  }

  const seen = new Set<string>();
  const counts: Record<PointClass, number> = {
    valid_metric_identity: 0,
    wrong_metric_identity: 0,
    duplicate_representation: 0,
    stale_generation: 0,
    reference_as_result: 0,
    malformed_source_row: 0,
    unknown: 0,
  };
  const structuralPoints = [];
  for (const point of json.points) {
    if (documentId && point.sourceDocumentId !== documentId) continue;
    const classification = classifyPoint({ metricKey: metric, point, seenKeys: seen });
    counts[classification] += 1;
    structuralPoints.push({
      acceptedResultId: point.acceptedResultId ?? point.id ?? null,
      sourceDocumentId: point.sourceDocumentId ?? null,
      canonicalMetricId: point.canonicalMetricId ?? null,
      collectedCalendarDate: point.sourceCalendarDate ?? point.collectedAt?.slice(0, 10) ?? null,
      resultKind: point.result?.kind ?? null,
      comparator: point.result?.comparator ?? null,
      unit: point.normalizedUnit ?? point.rawUnit ?? null,
      panelId: point.panelId ?? null,
      specimenType: point.specimenType ?? null,
      methodId: point.methodId ?? null,
      sourcePage: point.sourcePage ?? null,
      historyPointId: point.historyPointId ?? null,
      trendEligible: point.trendEligible ?? null,
      trendEligibility: point.trendEligibility ?? null,
      hasReferenceRange: Boolean(point.rawReferenceRange?.trim()),
      classification,
      // Structural scale only — not the private measured value.
      valueScaleBucket:
        typeof point.result?.value === "number"
          ? point.result.value < 20
            ? "lt_20"
            : point.result.value < 100
              ? "20_99"
              : "gte_100"
          : null,
    });
  }

  log({
    ok: true,
    metric,
    documentFilter: documentId ?? null,
    pointCount: structuralPoints.length,
    counts,
    points: structuralPoints,
  });
}

main().catch((err) => {
  log({ ok: false, error: "PROBE_FAILED", message: err instanceof Error ? err.message : "unknown" });
  process.exit(1);
});
