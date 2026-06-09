// GET/POST/DELETE /users/me/nutrition/pantry — `users/{uid}/pantry/{itemId}`
import { Router, type Response } from "express";
import {
  addPantryItemRequestSchema,
  nutritionPantryListDtoSchema,
  pantryItemSchema,
  type AddPantryItemRequest,
  type PantryItem,
} from "@oli/contracts/nutritionPantry";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { userPantryCollection } from "../db";

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
 * Stable stringify of the mutable fields (excludes id, addedAt, schemaVersion).
 */
function pantryCanonicalContent(body: AddPantryItemRequest): string {
  return JSON.stringify({
    label: body.label,
    oliFoodId: body.oliFoodId ?? undefined,
    storeId: body.storeId ?? undefined,
    productType: body.productType ?? undefined,
    servingLabel: body.servingLabel ?? undefined,
    defaultServings: body.defaultServings ?? undefined,
    macrosPerServing: body.macrosPerServing,
  });
}

function docToPantryItem(id: string, data: unknown): PantryItem | null {
  const parsed = pantryItemSchema.safeParse({ ...(typeof data === "object" && data !== null ? data : {}), id });
  return parsed.success ? parsed.data : null;
}

router.get(
  "/nutrition/pantry",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const snap = await userPantryCollection(uid).orderBy("addedAt", "desc").get();
    const items: PantryItem[] = [];
    for (const doc of snap.docs) {
      const item = docToPantryItem(doc.id, doc.data());
      if (item) items.push(item);
    }

    res.status(200).json(nutritionPantryListDtoSchema.parse({ schemaVersion: 1, items }));
  }),
);

router.post(
  "/nutrition/pantry",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      res.status(400).json({
        ok: false,
        error: {
          code: "MISSING_IDEMPOTENCY_KEY",
          message: "Idempotency-Key header is required for pantry item creation",
          requestId: getRid(req),
        },
      });
      return;
    }

    const parsed = addPantryItemRequestSchema.safeParse(req.body);
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
    const docRef = userPantryCollection(uid).doc(idempotencyKey);
    const existingSnap = await docRef.get();

    if (existingSnap.exists) {
      const existing = docToPantryItem(docRef.id, existingSnap.data());
      if (existing && pantryCanonicalContent(existing) === pantryCanonicalContent(body)) {
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

    const item: PantryItem = pantryItemSchema.parse({
      id: docRef.id,
      ...body,
      addedAt: new Date().toISOString(),
      schemaVersion: 1,
    });

    await docRef.create(item);
    res.status(202).json({ ok: true as const, id: docRef.id });
  }),
);

router.delete(
  "/nutrition/pantry/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const id = typeof req.params.id === "string" ? req.params.id.trim() : "";
    if (!id) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_ID", message: "Invalid pantry item id", requestId: getRid(req) },
      });
      return;
    }

    const ref = userPantryCollection(uid).doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Pantry item not found", requestId: getRid(req) },
      });
      return;
    }

    await ref.delete();
    res.status(204).send();
  }),
);

export default router;
