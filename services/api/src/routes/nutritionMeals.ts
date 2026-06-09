// GET/POST/DELETE /users/me/nutrition/meals — `users/{uid}/meals/{mealId}`
import { Router, type Response } from "express";
import {
  createMealRequestSchema,
  mealSchema,
  nutritionMealListDtoSchema,
  type CreateMealRequest,
  type Meal,
} from "@oli/contracts/nutritionMeal";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { userMealsCollection } from "../db";

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

/**
 * Canonical Idempotency-Key interface (mirrors events.ts / usersMe.ts getIdempotencyKey).
 * Header is the canonical interface; middleware injection is preserved for compatibility.
 */
const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);
  if (fromHeader) return fromHeader;
  const anyReq = req as unknown as { idempotencyKey?: unknown };
  return typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;
};

/**
 * Canonical content for idempotent-replay comparison.
 * Stable stringify of the mutable fields (excludes id, totals, timestamps, schemaVersion).
 */
function mealCanonicalContent(body: CreateMealRequest): string {
  return JSON.stringify({
    name: body.name,
    items: body.items,
    defaultMealSlot: body.defaultMealSlot ?? undefined,
  });
}

function sumMealTotals(items: Meal["items"]): Meal["totals"] {
  let caloriesKcal = 0;
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  for (const item of items) {
    const s = item.servings;
    caloriesKcal += item.macrosPerServing.caloriesKcal * s;
    proteinG += item.macrosPerServing.proteinG * s;
    carbsG += item.macrosPerServing.carbsG * s;
    fatG += item.macrosPerServing.fatG * s;
  }
  const round = (n: number) => Math.round(n * 10) / 10;
  return {
    caloriesKcal: round(caloriesKcal),
    proteinG: round(proteinG),
    carbsG: round(carbsG),
    fatG: round(fatG),
  };
}

function docToMeal(id: string, data: unknown): Meal | null {
  const parsed = mealSchema.safeParse({ ...(typeof data === "object" && data !== null ? data : {}), id });
  return parsed.success ? parsed.data : null;
}

router.get(
  "/nutrition/meals",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const snap = await userMealsCollection(uid).orderBy("updatedAt", "desc").get();
    const items: Meal[] = [];
    for (const doc of snap.docs) {
      const meal = docToMeal(doc.id, doc.data());
      if (meal) items.push(meal);
    }

    res.status(200).json(nutritionMealListDtoSchema.parse({ schemaVersion: 1, items }));
  }),
);

router.post(
  "/nutrition/meals",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required for meal creation",
          requestId: getRid(req),
        },
      });
      return;
    }

    const parsed = createMealRequestSchema.safeParse(req.body);
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

    const body = parsed.data;

    // Deterministic doc id = Idempotency-Key → retries never duplicate.
    const docRef = userMealsCollection(uid).doc(idempotencyKey);
    const existingSnap = await docRef.get();

    if (existingSnap.exists) {
      const existing = docToMeal(docRef.id, existingSnap.data());
      if (existing && mealCanonicalContent(existing) === mealCanonicalContent(body)) {
        res.status(202).json({ ok: true as const, id: docRef.id, idempotentReplay: true as const });
        return;
      }
      res.status(409).json({
        ok: false as const,
        error: { code: "IMMUTABLE_CONFLICT" as const },
        requestId: getRid(req),
      });
      return;
    }

    const now = new Date().toISOString();
    const totals = sumMealTotals(body.items);
    const meal: Meal = mealSchema.parse({
      id: docRef.id,
      name: body.name,
      items: body.items,
      totals,
      ...(body.defaultMealSlot !== undefined ? { defaultMealSlot: body.defaultMealSlot } : {}),
      createdAt: now,
      updatedAt: now,
      schemaVersion: 1,
    });

    await docRef.create(meal);
    res.status(202).json({ ok: true as const, id: docRef.id });
  }),
);

router.delete(
  "/nutrition/meals/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid meal id", requestId: getRid(req) },
      });
      return;
    }

    const ref = userMealsCollection(uid).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Meal not found", requestId: getRid(req) },
      });
      return;
    }

    await ref.delete();
    res.status(204).send();
  }),
);

export default router;
