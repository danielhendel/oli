/**
 * User-owned exercise definitions — Firestore `users/{uid}/exerciseDefinitions/{exerciseId}`.
 *
 * Authenticated CRUD surface (list/create/update). Writes are validated with @oli/contracts.
 * Mirrors client AsyncStorage custom exercise shape for dual-write rollout.
 */
import { Router, type Response } from "express";
import {
  buildStableCustomExerciseId,
  exerciseDefinitionCreateBodySchema,
  exerciseDefinitionFirestoreDocSchema,
  exerciseDefinitionListResponseSchema,
  exerciseDefinitionRowSchema,
  exerciseDefinitionUpdateBodySchema,
  isUserScopedCustomExerciseId,
  type ExerciseDefinitionFirestoreDoc,
  type ExerciseDefinitionRow,
} from "@oli/contracts";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import type { RequestWithRid } from "../lib/logger";
import { logger } from "../lib/logger";
import { userCollection } from "../db";

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

function nowIso(): string {
  return new Date().toISOString();
}

function docToRow(data: unknown): ExerciseDefinitionRow | null {
  const parsed = exerciseDefinitionFirestoreDocSchema.safeParse(data);
  if (!parsed.success) return null;
  const { schemaVersion, ...rest } = parsed.data;
  void schemaVersion;
  const row = exerciseDefinitionRowSchema.safeParse(rest);
  return row.success ? row.data : null;
}

/**
 * GET /exercise-definitions
 * Lists all user-defined exercises (small bounded set; no pagination in v1).
 */
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const snap = await userCollection(uid, "exerciseDefinitions").get();
    const items: ExerciseDefinitionRow[] = [];
    for (const doc of snap.docs) {
      const row = docToRow(doc.data());
      if (row != null) items.push(row);
      else {
        logger.info({
          msg: "exercise_definitions_skip_invalid_doc",
          rid: getRid(req),
          exerciseId: doc.id,
        });
      }
    }
    items.sort((a, b) => a.exerciseId.localeCompare(b.exerciseId));

    const out = exerciseDefinitionListResponseSchema.parse({ items });
    res.status(200).json(out);
  }),
);

/**
 * POST /exercise-definitions
 * Creates a new definition. Optional body.exerciseId for migration when id is user-owned custom_*.
 */
router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const parsedBody = exerciseDefinitionCreateBodySchema.safeParse(req.body);
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

    const col = userCollection(uid, "exerciseDefinitions");
    const snap = await col.get();
    const existingIds = new Set(snap.docs.map((d) => d.id));

    let exerciseId: string;
    if (parsedBody.data.exerciseId !== undefined) {
      const requested = parsedBody.data.exerciseId.trim();
      if (!isUserScopedCustomExerciseId(uid, requested)) {
        res.status(400).json({
          ok: false,
          error: {
            code: "INVALID_EXERCISE_ID",
            message: "exerciseId must be a user-owned custom_* id",
            requestId: getRid(req),
          },
        });
        return;
      }
      if (existingIds.has(requested)) {
        res.status(409).json({
          ok: false,
          error: {
            code: "CONFLICT",
            message: "Exercise definition already exists",
            requestId: getRid(req),
          },
        });
        return;
      }
      exerciseId = requested;
    } else {
      exerciseId = buildStableCustomExerciseId(uid, parsedBody.data.name, existingIds);
    }

    const t = nowIso();
    const data = parsedBody.data;
    const row: ExerciseDefinitionRow = {
      exerciseId,
      name: data.name.trim(),
      equipment: data.equipment,
      primary: data.primary,
      loggingType: data.loggingType,
      createdAt: t,
      updatedAt: t,
    };
    if (data.aliases !== undefined) row.aliases = data.aliases;
    if (data.movementPattern !== undefined) row.movementPattern = data.movementPattern;
    if (data.primaryMusclesDetailed !== undefined) row.primaryMusclesDetailed = data.primaryMusclesDetailed;
    if (data.secondaryMusclesDetailed !== undefined)
      row.secondaryMusclesDetailed = data.secondaryMusclesDetailed;
    if (data.muscleContributions !== undefined) row.muscleContributions = data.muscleContributions;
    if (data.stability !== undefined) row.stability = data.stability;
    if (data.laterality !== undefined) row.laterality = data.laterality;
    if (data.imageUrl !== undefined) row.imageUrl = data.imageUrl;
    if (data.videoUrl !== undefined) row.videoUrl = data.videoUrl;
    if (data.mediaUrl !== undefined) row.mediaUrl = data.mediaUrl;
    const docBody: ExerciseDefinitionFirestoreDoc = exerciseDefinitionFirestoreDocSchema.parse({
      ...row,
      schemaVersion: 1 as const,
    });

    await col.doc(exerciseId).set(docBody);
    res.status(201).json(row);
  }),
);

/**
 * PUT /exercise-definitions/:exerciseId
 * Partial update of an existing definition.
 */
router.put(
  "/:exerciseId",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const exerciseId = typeof req.params.exerciseId === "string" ? req.params.exerciseId.trim() : "";
    if (exerciseId.length === 0) {
      res.status(400).json({
        ok: false,
        error: { code: "INVALID_PARAMS", message: "exerciseId is required", requestId: getRid(req) },
      });
      return;
    }

    const parsedBody = exerciseDefinitionUpdateBodySchema.safeParse(req.body);
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

    const ref = userCollection(uid, "exerciseDefinitions").doc(exerciseId);
    const snap = await ref.get();
    if (!snap.exists) {
      res.status(404).json({
        ok: false,
        error: { code: "NOT_FOUND", message: "Exercise definition not found", requestId: getRid(req) },
      });
      return;
    }

    const existingParsed = exerciseDefinitionFirestoreDocSchema.safeParse(snap.data());
    if (!existingParsed.success) {
      logger.error({
        msg: "invalid_firestore_doc",
        rid: getRid(req),
        resource: "exerciseDefinitions",
        details: existingParsed.error.flatten(),
      });
      res.status(500).json({
        ok: false,
        error: {
          code: "INVALID_DOC",
          message: "Invalid exercise definition document",
          requestId: getRid(req),
        },
      });
      return;
    }

    const patch = parsedBody.data;
    const next: ExerciseDefinitionFirestoreDoc = exerciseDefinitionFirestoreDocSchema.parse({
      ...existingParsed.data,
      ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
      ...(patch.equipment !== undefined ? { equipment: patch.equipment } : {}),
      ...(patch.primary !== undefined ? { primary: patch.primary } : {}),
      ...(patch.loggingType !== undefined ? { loggingType: patch.loggingType } : {}),
      ...(patch.aliases !== undefined ? { aliases: patch.aliases } : {}),
      ...(patch.movementPattern !== undefined ? { movementPattern: patch.movementPattern } : {}),
      ...(patch.primaryMusclesDetailed !== undefined
        ? { primaryMusclesDetailed: patch.primaryMusclesDetailed }
        : {}),
      ...(patch.secondaryMusclesDetailed !== undefined
        ? { secondaryMusclesDetailed: patch.secondaryMusclesDetailed }
        : {}),
      ...(patch.muscleContributions !== undefined ? { muscleContributions: patch.muscleContributions } : {}),
      ...(patch.stability !== undefined ? { stability: patch.stability } : {}),
      ...(patch.laterality !== undefined ? { laterality: patch.laterality } : {}),
      ...(patch.imageUrl !== undefined ? { imageUrl: patch.imageUrl } : {}),
      ...(patch.videoUrl !== undefined ? { videoUrl: patch.videoUrl } : {}),
      ...(patch.mediaUrl !== undefined ? { mediaUrl: patch.mediaUrl } : {}),
      updatedAt: nowIso(),
    });

    await ref.set(next);
    const { schemaVersion, ...row } = next;
    void schemaVersion;
    const rowOut = exerciseDefinitionRowSchema.parse(row);
    res.status(200).json(rowOut);
  }),
);

export default router;
