// services/api/src/routes/profileMain.ts
// GET/PUT /profile/main — `users/{uid}/profile/main`
import { Router, type Response } from "express";
import {
  defaultUserProfileMain,
  materializeUserProfileMainForPutCreate,
  mergeUserProfileMain,
  userProfileMainPatchSchema,
  userProfileMainSchema,
  type UserProfileMain,
} from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { userProfileMainDoc } from "../db";

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
  logger.error({ msg: "invalid_firestore_doc", rid, resource, details });
  res.status(500).json({
    ok: false,
    error: {
      code: "INVALID_DOC",
      message: `Invalid ${resource} document`,
      requestId: rid,
    },
  });
};

const stripUndefined = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function hydrateFromFirestore(raw: unknown): UserProfileMain {
  const r = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const def = defaultUserProfileMain();
  const appRaw = r["app"] as Record<string, unknown> | undefined;
  const puRaw = appRaw?.["preferredUnits"] as Record<string, unknown> | undefined;
  const merged: UserProfileMain = {
    identity: { ...def.identity, ...((r["identity"] ?? {}) as Record<string, unknown>) },
    body: { ...def.body, ...((r["body"] ?? {}) as Record<string, unknown>) },
    bodyInputs: { ...def.bodyInputs, ...((r["bodyInputs"] ?? {}) as Record<string, unknown>) },
    app: {
      preferredUnits: {
        ...def.app.preferredUnits,
        ...(puRaw ?? {}),
      },
    },
  };
  const parsed = userProfileMainSchema.safeParse(merged);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}

/**
 * GET /profile/main
 */
router.get(
  "/main",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const ref = userProfileMainDoc(uid);
    const snap = await ref.get();

    if (!snap.exists) {
      res.status(200).json(null);
      return;
    }

    try {
      const data = hydrateFromFirestore(snap.data());
      res.status(200).json(data);
    } catch (err) {
      invalidDoc500(req, res, "profile/main", err);
    }
  }),
);

/**
 * PUT /profile/main
 */
router.put(
  "/main",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedBody = userProfileMainPatchSchema.safeParse(req.body);
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

    const ref = userProfileMainDoc(uid);
    const snap = await ref.get();

    let next: UserProfileMain;
    if (!snap.exists) {
      try {
        next = materializeUserProfileMainForPutCreate(parsedBody.data);
      } catch {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_PROFILE",
            message: "Profile failed validation after merge",
            requestId: getRid(req),
          },
        });
        return;
      }
    } else {
      let base: UserProfileMain;
      try {
        base = hydrateFromFirestore(snap.data());
      } catch (err) {
        invalidDoc500(req, res, "profile/main", err);
        return;
      }
      try {
        next = mergeUserProfileMain(base, parsedBody.data);
      } catch {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_PROFILE",
            message: "Profile failed validation after merge",
            requestId: getRid(req),
          },
        });
        return;
      }
    }

    await ref.set(stripUndefined(next), { merge: true });
    res.status(200).json(next);
  }),
);

export default router;
