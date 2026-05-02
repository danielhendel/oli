// GET/PUT /users/me/nutrition-meta — `users/{uid}/nutritionMeta/state`
import { Router, type Response } from "express";
import { defaultNutritionMetaDto, nutritionMetaDtoSchema } from "@oli/contracts/nutritionMeta";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { userNutritionMetaStateDoc } from "../db";

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

router.get(
  "/nutrition-meta",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const ref = userNutritionMetaStateDoc(uid);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(200).json(defaultNutritionMetaDto());
      return;
    }

    const parsed = nutritionMetaDtoSchema.safeParse(snap.data());
    if (!parsed.success) {
      logger.error({ msg: "nutrition_meta_invalid_stored", rid: getRid(req), uid, err: parsed.error.flatten() });
      res.status(500).json({
        ok: false,
        error: { code: "INVALID_STORED_DOC", message: "Invalid nutrition metadata", requestId: getRid(req) },
      });
      return;
    }

    res.status(200).json(parsed.data);
  }),
);

router.put(
  "/nutrition-meta",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsed = nutritionMetaDtoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        ok: false,
        error: {
          code: "INVALID_BODY",
          message: "Invalid request body",
          details: parsed.error.flatten(),
          requestId: getRid(req),
        },
      });
      return;
    }

    await userNutritionMetaStateDoc(uid).set(parsed.data);
    res.status(200).json(parsed.data);
  }),
);

export default router;
