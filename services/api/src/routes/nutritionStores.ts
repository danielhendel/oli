// GET /users/me/nutrition/stores — reference store catalog
import { Router, type Response } from "express";
import { nutritionStoreListDtoSchema } from "@oli/contracts/nutritionStore";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { listNutritionStores } from "../lib/nutritionStoreCatalog";

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
  "/nutrition/stores",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const items = listNutritionStores();
    res.status(200).json(nutritionStoreListDtoSchema.parse({ schemaVersion: 1, items }));
  }),
);

export default router;
