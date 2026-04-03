// services/api/src/routes/preferences.ts
import { Router, type Response } from "express";
import { z } from "zod";
import { preferencesSchema, defaultPreferences } from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { userDoc } from "../db";

const router = Router();

const getRid = (req: AuthedRequest): string => (req as RequestWithRid).rid ?? "unknown";

const requireUid = (req: AuthedRequest, res: Response): string | null => {
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({
      ok: false,
      error: { code: "UNAUTHORIZED", message: "Unauthorized", requestId: getRid(req) },
    });
    return null;
  }
  return uid;
};

const invalidDoc500 = (req: AuthedRequest, res: Response, resource: string, details: unknown) => {
  const rid = getRid(req);

  logger.error({
    msg: "invalid_firestore_doc",
    rid,
    resource,
    details,
  });

  res.status(500).json({
    ok: false,
    error: {
      code: "INVALID_DOC",
      message: `Invalid ${resource} document`,
      requestId: rid,
    },
  });
};

const preferencesPatchSchema = z
  .object({
    // For Phase 1 we keep patch surface minimal & explicit (no “partial deep merge” guessing).
    units: z
      .object({
        mass: z.enum(["lb", "kg"]).optional(),
      })
      .optional(),
    timezone: z
      .object({
        mode: z.enum(["recorded", "current", "explicit"]).optional(),
        explicitIana: z.string().min(1).optional(),
      })
      .optional(),
    selectedGymId: z.string().nullable().optional(),
    /** Data Sources: metricId -> sourceId; null value means clear that metric's preference. */
    metricSources: z.record(z.string().min(1), z.string().min(1).nullable()).optional(),
  })
  .strip();

/**
 * Firestore does not allow undefined values anywhere in documents.
 * This strips undefined keys recursively for plain JSON-like objects.
 */
const stripUndefined = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

const LEGACY_BODY_SOURCE_ID = "withings";
const APPLE_HEALTH_SOURCE_ID = "apple_health";
const BODY_METRIC_KEYS = [
  "weight",
  "body_fat_percent",
  "bmi",
  "lean_body_mass",
  "resting_metabolic_rate",
] as const;

function normalizeMetricSourcesForAppleHealthOnly(
  metricSources: Record<string, string> | undefined,
): { metricSources: Record<string, string>; changed: boolean } {
  const next: Record<string, string> = { ...(metricSources ?? {}) };
  let changed = false;

  for (const metricKey of BODY_METRIC_KEYS) {
    const existing = next[metricKey];
    if (existing === LEGACY_BODY_SOURCE_ID) {
      next[metricKey] = APPLE_HEALTH_SOURCE_ID;
      changed = true;
      continue;
    }
    if (!existing) {
      next[metricKey] = APPLE_HEALTH_SOURCE_ID;
      changed = true;
    }
  }

  return { metricSources: next, changed };
}

/**
 * GET /preferences
 *
 * Returns the user's view-layer preferences.
 * If missing, materializes Phase 1 defaults and persists them.
 *
 * Properties:
 * - Authenticated
 * - User-scoped
 * - Preferences affect VIEW ONLY (units, timezone bucketing)
 * - Canonical truth remains immutable
 */
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const ref = userDoc(uid);
    const snap = await ref.get();

    // If no user doc exists yet, materialize it with defaults.
    if (!snap.exists) {
      const prefs = defaultPreferences();
      const normalized = normalizeMetricSourcesForAppleHealthOnly(prefs.metricSources);
      const hydrated = { ...prefs, metricSources: normalized.metricSources };
      await ref.set({ preferences: hydrated }, { merge: true });

      res.status(200).json(hydrated);
      return;
    }

    const data = snap.data() as Record<string, unknown> | undefined;
    const rawPrefs = data?.["preferences"];

    // If preferences missing, set defaults.
    if (!rawPrefs) {
      const prefs = defaultPreferences();
      const normalized = normalizeMetricSourcesForAppleHealthOnly(prefs.metricSources);
      const hydrated = { ...prefs, metricSources: normalized.metricSources };
      await ref.set({ preferences: hydrated }, { merge: true });

      res.status(200).json(hydrated);
      return;
    }

    // Merge with defaults so older docs missing new keys (e.g. selectedGymId) still validate.
    const merged = { ...defaultPreferences(), ...(rawPrefs as Record<string, unknown>) };
    const parsed = preferencesSchema.safeParse(merged);
    if (!parsed.success) {
      invalidDoc500(req, res, "preferences", parsed.error.flatten());
      return;
    }

    const normalized = normalizeMetricSourcesForAppleHealthOnly(parsed.data.metricSources);
    const responsePrefs = { ...parsed.data, metricSources: normalized.metricSources };
    if (normalized.changed) {
      await ref.set({ preferences: responsePrefs }, { merge: true });
    }

    res.status(200).json(responsePrefs);
  }),
);

/**
 * PUT /preferences
 *
 * Updates view-layer preferences.
 * Fail-closed: request is validated; stored document is validated before returning.
 *
 * NOTE:
 * - We do not allow arbitrary deep partial merges without validation.
 * - We merge the provided fields over the existing (or default) preferences, then validate.
 */
router.put(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedBody = preferencesPatchSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsedBody.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    const patch = parsedBody.data;

    const ref = userDoc(uid);
    const snap = await ref.get();

    const existingRaw =
      snap.exists ? ((snap.data() as Record<string, unknown> | undefined)?.["preferences"] ?? null) : null;

    const existingMerged = existingRaw
      ? { ...defaultPreferences(), ...(existingRaw as Record<string, unknown>) }
      : null;
    const existingParsed = existingMerged ? preferencesSchema.safeParse(existingMerged) : null;

    // If existing is missing, start from defaults. If it exists but is invalid, fail closed.
    if (existingRaw && existingParsed && !existingParsed.success) {
      invalidDoc500(req, res, "preferences", existingParsed.error.flatten());
      return;
    }

    const base = existingParsed?.success ? existingParsed.data : defaultPreferences();

    // Compute the next mode first (so explicitIana handling is consistent)
    const nextMode = patch.timezone?.mode ?? base.timezone.mode;

    // Build candidate preferences WITHOUT ever placing explicitIana: undefined into the object
    const nextMetricSources: Record<string, string> = { ...(base.metricSources ?? {}) };
    if (patch.metricSources !== undefined) {
      for (const [k, v] of Object.entries(patch.metricSources)) {
        if (v === null || v === "") {
          delete nextMetricSources[k];
        } else {
          nextMetricSources[k] = v;
        }
      }
    }

    const candidate = {
      units: {
        mass: patch.units?.mass ?? base.units.mass,
      },
      timezone: {
        mode: nextMode,
        ...(nextMode === "explicit"
          ? {
              // If explicit mode, take patched explicitIana or fall back to existing explicitIana
              explicitIana: patch.timezone?.explicitIana ?? base.timezone.explicitIana,
            }
          : {}),
      },
      selectedGymId: patch.selectedGymId !== undefined ? patch.selectedGymId : base.selectedGymId,
      metricSources: nextMetricSources,
    };

    const normalizedMetricSources = normalizeMetricSourcesForAppleHealthOnly(candidate.metricSources);
    const next = preferencesSchema.safeParse({
      ...candidate,
      metricSources: normalizedMetricSources.metricSources,
    });

    if (!next.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_PREFERENCES",
          message: "Preferences failed validation",
          details: next.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    // Defensive: strip undefined (Firestore rejects undefined anywhere)
    await ref.set(stripUndefined({ preferences: next.data }), { merge: true });

    res.status(200).json(next.data);
  }),
);

export default router;
