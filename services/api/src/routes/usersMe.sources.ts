// services/api/src/routes/usersMe.sources.ts
import { Router, type Response } from "express";

import type { AuthedRequest } from "../middleware/auth";
import { asyncHandler } from "../lib/asyncHandler";
import { userCollection } from "../db";
import {
  createSourceBodySchema,
  patchSourceBodySchema,
  sourceDocSchema,
  validateSourceDeclarationSubset,
  type SourceDoc,
} from "../types/sources";

const router = Router();

type ErrorBody = {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

const badRequest = (res: Response, code: string, message: string, details?: unknown) =>
  res.status(400).json({
    ok: false,
    error: { code, message, ...(details ? { details } : {}) },
  } satisfies ErrorBody);

const notFound = (res: Response) =>
  res.status(404).json({ ok: false, error: { code: "NOT_FOUND", message: "Not found" } } satisfies ErrorBody);

const requireUid = (req: AuthedRequest, res: Response): string | null => {
  const uid = req.uid;
  if (!uid) {
    res.status(401).json({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
    return null;
  }
  return uid;
};

const nowIso = (): string => new Date().toISOString();

const requireParamId = (req: AuthedRequest, res: Response): string | null => {
  const idRaw = req.params?.id;
  const id = typeof idRaw === "string" ? idRaw.trim() : "";
  if (!id) {
    badRequest(res, "MISSING_ID", "id path param is required");
    return null;
  }
  return id;
};

/**
 * POST create routes must be idempotent (Invariant CHECK 3).
 * Prefer header-based idempotency; allow middleware injection if present.
 */
const getIdempotencyKey = (req: AuthedRequest): string | undefined => {
  const fromHeader =
    (typeof req.header("Idempotency-Key") === "string" ? req.header("Idempotency-Key") : undefined) ??
    (typeof req.header("X-Idempotency-Key") === "string" ? req.header("X-Idempotency-Key") : undefined);

  if (fromHeader) return fromHeader;

  const anyReq = req as unknown as { idempotencyKey?: unknown };
  const fromMiddleware = typeof anyReq.idempotencyKey === "string" ? anyReq.idempotencyKey : undefined;

  return fromMiddleware ?? undefined;
};

// POST /users/me/sources
router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const idempotencyKey = getIdempotencyKey(req);
    if (!idempotencyKey) {
      return badRequest(res, "MISSING_IDEMPOTENCY_KEY", "Idempotency-Key header is required for source creation");
    }

    const parsed = createSourceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "INVALID_BODY", "Invalid source body", parsed.error.flatten());
    }

    const body = parsed.data;
    const subset = validateSourceDeclarationSubset({
      provider: body.provider,
      sourceType: body.sourceType,
      allowedKinds: body.allowedKinds,
      supportedSchemaVersions: body.supportedSchemaVersions,
    });
    if (!subset.ok) {
      return badRequest(
        res,
        "UNSUPPORTED_SOURCE_CAPABILITIES",
        "Declared capabilities are not supported by this API",
        subset.details,
      );
    }

    const sourcesCol = userCollection(uid, "sources");

    // ✅ Deterministic ID = idempotency key
    const docRef = sourcesCol.doc(idempotencyKey);
    const id = docRef.id;

    // Replay-safe: if already exists, return existing doc (idempotent replay).
    const existing = await docRef.get();
    if (existing.exists) {
      const existingParsed = sourceDocSchema.safeParse(existing.data());
      if (!existingParsed.success) {
        return res.status(500).json({
          ok: false,
          error: { code: "INVALID_DOC", message: "Invalid source document" },
        });
      }
      return res.status(202).json({ ...existingParsed.data, idempotentReplay: true as const });
    }

    const ts = nowIso();
    const doc: SourceDoc = {
      id,
      userId: uid,
      provider: body.provider,
      sourceType: body.sourceType,
      isActive: body.isActive,
      allowedKinds: body.allowedKinds,
      supportedSchemaVersions: body.supportedSchemaVersions,
      ...(body.capabilities ? { capabilities: body.capabilities } : {}),
      createdAt: ts,
      updatedAt: ts,
    };

    const validated = sourceDocSchema.safeParse(doc);
    if (!validated.success) {
      return badRequest(res, "INVALID_DOC", "Invalid source document", validated.error.flatten());
    }

    try {
      await docRef.create(validated.data);
      return res.status(201).json(validated.data);
    } catch {
      // Race safety: if created between our pre-check and create(), treat as replay.
      const race = await docRef.get();
      if (race.exists) {
        const raceParsed = sourceDocSchema.safeParse(race.data());
        if (!raceParsed.success) {
          return res.status(500).json({
            ok: false,
            error: { code: "INVALID_DOC", message: "Invalid source document" },
          });
        }
        return res.status(202).json({ ...raceParsed.data, idempotentReplay: true as const });
      }

      return res.status(500).json({
        ok: false,
        error: { code: "SOURCE_CREATE_FAILED", message: "Failed to create source" },
      } satisfies ErrorBody);
    }
  }),
);

// GET /users/me/sources
router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const snap = await userCollection(uid, "sources").get();
    const out: SourceDoc[] = [];

    for (const d of snap.docs) {
      const parsed = sourceDocSchema.safeParse(d.data());
      if (!parsed.success) {
        return res.status(500).json({
          ok: false,
          error: { code: "INVALID_DOC", message: "Invalid source document" },
        });
      }
      out.push(parsed.data);
    }

    return res.status(200).json({ ok: true, sources: out });
  }),
);

// GET /users/me/sources/:id
router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const id = requireParamId(req, res);
    if (!id) return;

    const ref = userCollection(uid, "sources").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return notFound(res);

    const parsed = sourceDocSchema.safeParse(snap.data());
    if (!parsed.success) {
      return res.status(500).json({ ok: false, error: { code: "INVALID_DOC", message: "Invalid source document" } });
    }
    return res.status(200).json(parsed.data);
  }),
);

// PATCH /users/me/sources/:id
router.patch(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res: Response) => {
    const uid = requireUid(req, res);
    if (!uid) return;

    const id = requireParamId(req, res);
    if (!id) return;

    const parsed = patchSourceBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return badRequest(res, "INVALID_BODY", "Invalid patch body", parsed.error.flatten());
    }

    const ref = userCollection(uid, "sources").doc(id);
    const snap = await ref.get();
    if (!snap.exists) return notFound(res);

    const existing = sourceDocSchema.safeParse(snap.data());
    if (!existing.success) {
      return res.status(500).json({ ok: false, error: { code: "INVALID_DOC", message: "Invalid source document" } });
    }

    const patch = parsed.data;
    const next: SourceDoc = {
      ...existing.data,
      ...(typeof patch.isActive === "boolean" ? { isActive: patch.isActive } : {}),
      ...(patch.allowedKinds ? { allowedKinds: patch.allowedKinds } : {}),
      ...(patch.supportedSchemaVersions ? { supportedSchemaVersions: patch.supportedSchemaVersions } : {}),
      ...(patch.capabilities ? { capabilities: patch.capabilities } : {}),
      updatedAt: nowIso(),
    };

    const subset = validateSourceDeclarationSubset({
      provider: next.provider,
      sourceType: next.sourceType,
      allowedKinds: next.allowedKinds,
      supportedSchemaVersions: next.supportedSchemaVersions,
    });
    if (!subset.ok) {
      return badRequest(
        res,
        "UNSUPPORTED_SOURCE_CAPABILITIES",
        "Declared capabilities are not supported by this API",
        subset.details,
      );
    }

    const validated = sourceDocSchema.safeParse(next);
    if (!validated.success) {
      return badRequest(res, "INVALID_DOC", "Invalid source document", validated.error.flatten());
    }

    await ref.set(validated.data);
    return res.status(200).json(validated.data);
  }),
);

export default router;
