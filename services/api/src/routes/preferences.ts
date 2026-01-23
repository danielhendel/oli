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
  })
  .strip();

/**
 * Firestore does not allow undefined values anywhere in documents.
 * This strips undefined keys recursively for plain JSON-like objects.
 */
const stripUndefined = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

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
      await ref.set({ preferences: prefs }, { merge: true });

      res.status(200).json(prefs);
      return;
    }

    const data = snap.data() as Record<string, unknown> | undefined;
    const rawPrefs = data?.["preferences"];

    // If preferences missing, set defaults.
    if (!rawPrefs) {
      const prefs = defaultPreferences();
      await ref.set({ preferences: prefs }, { merge: true });

      res.status(200).json(prefs);
      return;
    }

    const parsed = preferencesSchema.safeParse(rawPrefs);
    if (!parsed.success) {
      invalidDoc500(req, res, "preferences", parsed.error.flatten());
      return;
    }

    res.status(200).json(parsed.data);
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

    const existingParsed = existingRaw ? preferencesSchema.safeParse(existingRaw) : null;

    // If existing is missing, start from defaults. If it exists but is invalid, fail closed.
    if (existingRaw && existingParsed && !existingParsed.success) {
      invalidDoc500(req, res, "preferences", existingParsed.error.flatten());
      return;
    }

    const base = existingParsed?.success ? existingParsed.data : defaultPreferences();

    // Compute the next mode first (so explicitIana handling is consistent)
    const nextMode = patch.timezone?.mode ?? base.timezone.mode;

    // Build candidate preferences WITHOUT ever placing explicitIana: undefined into the object
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
    };

    const next = preferencesSchema.safeParse(candidate);

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
