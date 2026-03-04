import { appendWorkoutJournalEvent, listWorkoutJournalEvents } from "@/lib/workouts/journal/store";
import { addWorkoutJournalSessionId } from "@/lib/workouts/journal/sessionIndex";
import { reduceWorkoutSessionV1 } from "@/lib/workouts/journal/reducer";
import type { WorkoutEventV1, WorkoutSessionStatus } from "@/lib/workouts/journal/types";

/**
 * Session Engine Commands
 * UI-safe, storage-backed command layer over the append-only journal.
 *
 * Determinism:
 * - time/id generation is dependency-injected for tests.
 * - no network, no background work.
 */

export type IdFactory = (prefix: string) => string;
export type NowIsoFactory = () => string;

export type SessionEngineDeps = {
  nowIso: NowIsoFactory;
  makeId: IdFactory;
  deviceTimeZone: string;
};

function defaultNowIso(): string {
  return new Date().toISOString();
}

function defaultMakeId(prefix: string): string {
  // Non-cryptographic unique id. Tests inject deterministic ids.
  // Format is stable and sortable-ish for debugging.
  const now = Date.now();
  const rand = Math.floor(Math.random() * 1_000_000_000);
  return `${prefix}_${now}_${rand}`;
}

function resolveDeps(deps?: Partial<SessionEngineDeps>): SessionEngineDeps {
  return {
    nowIso: deps?.nowIso ?? defaultNowIso,
    makeId: deps?.makeId ?? defaultMakeId,
    deviceTimeZone:
      deps?.deviceTimeZone ??
      (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"),
  };
}

export type SessionEngineErrorCode =
  | "INVALID_TRANSITION"
  | "MISSING_SESSION"
  | "INVALID_INPUT";

export class SessionEngineError extends Error {
  readonly code: SessionEngineErrorCode;
  constructor(code: SessionEngineErrorCode, message: string) {
    super(message);
    this.code = code;
  }
}

function assertNonEmpty(name: string, v: string): void {
  if (typeof v !== "string" || v.trim() === "") {
    throw new SessionEngineError("INVALID_INPUT", `${name} is required`);
  }
}

function canTransition(from: WorkoutSessionStatus, to: WorkoutSessionStatus): boolean {
  if (from === to) return true;
  const allowed: Record<WorkoutSessionStatus, WorkoutSessionStatus[]> = {
    draft: ["planned", "active", "abandoned", "draft"],
    planned: ["active", "abandoned", "planned"],
    active: ["completed", "abandoned", "active"],
    completed: ["archived", "completed"],
    abandoned: ["archived", "abandoned"],
    archived: ["archived"],
  };
  return (allowed[from] ?? []).includes(to);
}

async function loadStatusOrThrow(uid: string, sessionId: string): Promise<WorkoutSessionStatus> {
  const events = await listWorkoutJournalEvents(uid, sessionId);
  if (events.length === 0) {
    throw new SessionEngineError("MISSING_SESSION", "Session not found");
  }
  const reduced = reduceWorkoutSessionV1(events);
  return reduced.status;
}

function mkBaseEvent(params: {
  uid: string;
  sessionId: string;
  deps: SessionEngineDeps;
  kind: WorkoutEventV1["kind"];
  payload: WorkoutEventV1["payload"];
  idempotencyKey: string;
  eventId?: string;
}): WorkoutEventV1 {
  const { uid, sessionId, deps, kind, payload, idempotencyKey } = params;
  const occurredAt = deps.nowIso();
  const eventId = params.eventId ?? deps.makeId("wev");
  return {
    kind,
    eventId,
    ownerUid: uid,
    sessionId,
    occurredAt,
    capturedAt: occurredAt,
    deviceTimeZone: deps.deviceTimeZone,
    source: "manual",
    idempotencyKey,
    payload,
  } as WorkoutEventV1;
}

/**
 * Creates a new sessionId and seeds the journal with a draft state event (draft→draft).
 * This is intentionally a no-op transition to establish the envelope deterministically.
 */
export async function createSessionDraft(
  uid: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<{ sessionId: string }> {
  assertNonEmpty("uid", uid);
  const d = resolveDeps(deps);
  const sessionId = d.makeId("ws");
  await addWorkoutJournalSessionId(uid, sessionId);
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_session_state_changed",
    payload: { from: "draft", to: "draft", reason: "system" },
    idempotencyKey: `session:create:${sessionId}`,
    eventId: d.makeId("wev"),
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
  return { sessionId };
}

export async function setSessionStatus(
  uid: string,
  sessionId: string,
  to: WorkoutSessionStatus,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  const d = resolveDeps(deps);
  const from = await loadStatusOrThrow(uid, sessionId);
  if (!canTransition(from, to)) {
    throw new SessionEngineError(
      "INVALID_TRANSITION",
      `Invalid session transition ${from} → ${to}`,
    );
  }

  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_session_state_changed",
    payload: { from, to, reason: "user" },
    idempotencyKey: `session:status:${sessionId}:${from}->${to}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}

export async function startSession(
  uid: string,
  sessionId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  await setSessionStatus(uid, sessionId, "active", deps);
}

export async function completeSession(
  uid: string,
  sessionId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  await setSessionStatus(uid, sessionId, "completed", deps);
}

export async function abandonSession(
  uid: string,
  sessionId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  await setSessionStatus(uid, sessionId, "abandoned", deps);
}

export async function archiveSession(
  uid: string,
  sessionId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  await setSessionStatus(uid, sessionId, "archived", deps);
}

const BLOCK_TYPES = ["warmup", "sets", "superset", "circuit", "cooldown", "cardio"] as const;

/**
 * Creates an empty block (append workout_block_created).
 */
export async function createBlock(
  uid: string,
  sessionId: string,
  params: {
    blockId: string;
    blockType: (typeof BLOCK_TYPES)[number];
    position: number;
    title?: string;
  },
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("blockId", params.blockId);
  if (!BLOCK_TYPES.includes(params.blockType)) {
    throw new SessionEngineError("INVALID_INPUT", "blockType must be one of: warmup, sets, superset, circuit, cooldown, cardio");
  }
  if (!Number.isFinite(params.position) || params.position < 0) {
    throw new SessionEngineError("INVALID_INPUT", "position must be non-negative");
  }

  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_block_created",
    payload: {
      blockId: params.blockId,
      blockType: params.blockType,
      position: Math.floor(params.position),
      title: params.title,
    },
    idempotencyKey: `session:createBlock:${sessionId}:${params.blockId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}

/**
 * Updates a block (append workout_block_updated). Patch may include blockType and/or title.
 */
export async function updateBlock(
  uid: string,
  sessionId: string,
  params: {
    blockId: string;
    patch: Partial<{ blockType: (typeof BLOCK_TYPES)[number]; title: string }>;
  },
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("blockId", params.blockId);
  const patch = params.patch;
  const keys = patch && Object.keys(patch);
  if (!keys || keys.length === 0) {
    throw new SessionEngineError("INVALID_INPUT", "patch must have at least one key");
  }
  if (patch.blockType != null && !BLOCK_TYPES.includes(patch.blockType)) {
    throw new SessionEngineError("INVALID_INPUT", "blockType must be one of: warmup, sets, superset, circuit, cooldown, cardio");
  }
  if (patch.title != null && patch.title.length > 500) {
    throw new SessionEngineError("INVALID_INPUT", "title must be at most 500 characters");
  }

  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const patchPayload: { blockType?: (typeof BLOCK_TYPES)[number]; title?: string } = {};
  if (patch.blockType != null) patchPayload.blockType = patch.blockType;
  if (patch.title != null) patchPayload.title = patch.title;

  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_block_updated",
    payload: { blockId: params.blockId, patch: patchPayload, reason: "user" },
    idempotencyKey: `session:updateBlock:${sessionId}:${params.blockId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}

/**
 * Removes a block from the session (append workout_block_removed).
 */
export async function removeBlock(
  uid: string,
  sessionId: string,
  blockId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("blockId", blockId);

  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_block_removed",
    payload: { blockId, reason: "user" },
    idempotencyKey: `session:removeBlock:${sessionId}:${blockId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}

/**
 * Adds an exercise slot to the session (log-as-you-go).
 * Returns slotId for subsequent set logging.
 * blockId is optional; when provided (e.g. block:warmup, block:work, block:cooldown) it is stored in the payload.
 */
export async function addExercise(
  uid: string,
  sessionId: string,
  params: { exerciseId: string; position: number; slotId?: string; blockId?: string },
  deps?: Partial<SessionEngineDeps>,
): Promise<{ slotId: string }> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("exerciseId", params.exerciseId);
  if (!Number.isFinite(params.position) || params.position < 0) {
    throw new SessionEngineError("INVALID_INPUT", "position must be >= 0");
  }

  // Ensure session exists (fail-closed)
  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const slotId = params.slotId ?? d.makeId("slot");
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_exercise_added",
    payload: {
      slotId,
      exerciseId: params.exerciseId,
      position: Math.floor(params.position),
      blockId: params.blockId,
    },
    idempotencyKey: `session:addExercise:${sessionId}:${slotId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
  return { slotId };
}

/**
 * Removes an exercise slot from the session (append workout_exercise_removed).
 */
export async function removeExercise(
  uid: string,
  sessionId: string,
  slotId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("slotId", slotId);

  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "workout_exercise_removed",
    payload: { slotId, reason: "user" },
    idempotencyKey: `session:removeExercise:${sessionId}:${slotId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}

export async function logStrengthSet(
  uid: string,
  sessionId: string,
  params: {
    slotId: string;
    ordinal: number;
    reps: number;
    loadKg?: number;
    setId?: string;
    rpe?: number;
    tempo?: string;
    isWarmup?: boolean;
    note?: string;
  },
  deps?: Partial<SessionEngineDeps>,
): Promise<{ setId: string }> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("slotId", params.slotId);
  if (!Number.isFinite(params.ordinal) || params.ordinal <= 0) {
    throw new SessionEngineError("INVALID_INPUT", "ordinal must be >= 1");
  }
  if (!Number.isFinite(params.reps) || params.reps <= 0) {
    throw new SessionEngineError("INVALID_INPUT", "reps must be >= 1");
  }
  // loadKg optional: undefined/blank => bodyweight
  if (params.loadKg != null && (!Number.isFinite(params.loadKg) || params.loadKg <= 0)) {
    throw new SessionEngineError("INVALID_INPUT", "loadKg must be > 0 when provided");
  }

  // Ensure session exists
  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const setId = params.setId ?? d.makeId("set");

  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "strength_set_logged",
    payload: {
      setId,
      slotId: params.slotId,
      ordinal: Math.floor(params.ordinal),
      reps: Math.floor(params.reps),
      loadKg: params.loadKg,
      rpe: params.rpe,
      tempo: params.tempo,
      isWarmup: params.isWarmup,
      note: params.note,
    },
    idempotencyKey: `session:logSet:${sessionId}:${setId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
  return { setId };
}

/**
 * Removes a logged set (append strength_set_removed).
 */
export async function removeStrengthSet(
  uid: string,
  sessionId: string,
  setId: string,
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("setId", setId);

  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "strength_set_removed",
    payload: { setId, reason: "user" },
    idempotencyKey: `session:removeSet:${sessionId}:${setId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}

export async function correctStrengthSet(
  uid: string,
  sessionId: string,
  params: {
    setId: string;
    patch: Partial<{ reps: number; loadKg: number; rpe: number; tempo: string; isWarmup: boolean; note: string }>;
  },
  deps?: Partial<SessionEngineDeps>,
): Promise<void> {
  assertNonEmpty("uid", uid);
  assertNonEmpty("sessionId", sessionId);
  assertNonEmpty("setId", params.setId);

  // Ensure session exists
  void (await loadStatusOrThrow(uid, sessionId));

  const d = resolveDeps(deps);
  const ev = mkBaseEvent({
    uid,
    sessionId,
    deps: d,
    kind: "strength_set_corrected",
    payload: {
      setId: params.setId,
      patch: params.patch,
      correctionReason: "user_edit",
    },
    idempotencyKey: `session:correctSet:${sessionId}:${params.setId}`,
  });
  await appendWorkoutJournalEvent(uid, sessionId, ev);
}
