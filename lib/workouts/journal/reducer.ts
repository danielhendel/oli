import type {
  ReducedSessionV1,
  WorkoutEventV1,
  WorkoutSessionStatus,
  StrengthSetLogged,
  StrengthSetCorrected,
} from "./types";

type ExerciseSlotState = {
  slotId: string;
  blockId: string | null;
  exerciseId: string;
  position: number;
  removed: boolean;
  // base set logs by setId
  setsById: Map<string, StrengthSetLogged>;
  // corrections by setId (last write wins, deterministically by sorted order)
  correctionsBySetId: Map<string, StrengthSetCorrected["payload"]>;
  // set ids removed via strength_set_removed (excluded from output)
  removedSetIds: Set<string>;
};

function stableSortEvents(events: WorkoutEventV1[]): WorkoutEventV1[] {
  // Deterministic ordering: occurredAt asc, then eventId asc
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.occurredAt);
    const tb = Date.parse(b.occurredAt);
    if (ta !== tb) return ta - tb;
    return a.eventId.localeCompare(b.eventId);
  });
}

const DEFAULT_STATUS: WorkoutSessionStatus = "draft";

const BLOCK_TYPE_ORDER: readonly string[] = ["warmup", "sets", "superset", "circuit", "cooldown", "cardio"];

function inferBlockType(blockId: string): string | null {
  if (blockId.startsWith("block:warmup:")) return "warmup";
  if (blockId.startsWith("block:sets:")) return "sets";
  if (blockId.startsWith("block:superset:")) return "superset";
  if (blockId.startsWith("block:circuit:")) return "circuit";
  if (blockId.startsWith("block:cooldown:")) return "cooldown";
  if (blockId.startsWith("block:cardio:")) return "cardio";
  return null;
}

function inferBlockSortKey(blockId: string): number {
  const type = inferBlockType(blockId);
  const i = type != null ? BLOCK_TYPE_ORDER.indexOf(type) : 999;
  const suffix = blockId.split(":")[2] ?? "";
  const num = parseInt(suffix, 10);
  const sub = Number.isFinite(num) ? num : (suffix.charCodeAt(0) ?? 0);
  return i * 1000 + sub;
}

function inferBlockTitle(blockId: string): string {
  const type = inferBlockType(blockId);
  const suffix = blockId.split(":")[2] ?? "";
  if (type === "warmup") return suffix === "1" ? "Warm Up" : `Warm Up ${suffix}`;
  if (type === "sets") return suffix === "1" ? "Sets" : `Sets ${suffix}`;
  if (type === "cooldown") return suffix === "1" ? "Cool Down" : `Cool Down ${suffix}`;
  if (type === "superset") return `Superset ${suffix.toUpperCase() || "A"}`;
  if (type === "circuit") return `Circuit ${suffix}`;
  if (type === "cardio") return suffix === "1" ? "Cardio" : `Cardio ${suffix}`;
  return blockId;
}

export function reduceWorkoutSessionV1(events: WorkoutEventV1[]): ReducedSessionV1 {
  const sorted = stableSortEvents(events);
  if (sorted.length === 0) {
    return {
      ownerUid: "unknown",
      sessionId: "unknown",
      status: DEFAULT_STATUS,
      startedAt: null,
      blocks: [],
      exercises: [],
      notes: [],
      eventCount: 0,
    };
  }

  const ownerUid = sorted[0]!.ownerUid;
  const sessionId = sorted[0]!.sessionId;
  let status: WorkoutSessionStatus = DEFAULT_STATUS;
  let startedAt: string | null = null;
  const notes: string[] = [];
  const slots = new Map<string, ExerciseSlotState>();
  const blocksById = new Map<
    string,
    { blockType: string; position: number; title: string }
  >();
  const removedBlockIds = new Set<string>();

  for (const e of sorted) {
    // Fail-closed: ignore events that do not match the session envelope
    if (e.ownerUid !== ownerUid || e.sessionId !== sessionId) continue;

    switch (e.kind) {
      case "workout_session_state_changed": {
        status = e.payload.to;
        if (e.payload.to === "active" && startedAt === null) {
          startedAt = e.occurredAt;
        }
        break;
      }
      case "workout_note_added": {
        notes.push(e.payload.note);
        break;
      }
      case "workout_exercise_added": {
        const existing = slots.get(e.payload.slotId);
        const next: ExerciseSlotState = existing ?? {
          slotId: e.payload.slotId,
          blockId: null,
          exerciseId: e.payload.exerciseId,
          position: e.payload.position,
          removed: false,
          setsById: new Map(),
          correctionsBySetId: new Map(),
          removedSetIds: new Set(),
        };
        // Deterministic: last add wins for exerciseId/position/blockId if same slotId re-added
        next.exerciseId = e.payload.exerciseId;
        next.position = e.payload.position;
        next.removed = false;
        next.blockId = e.payload.blockId ?? null;
        slots.set(next.slotId, next);
        break;
      }
      case "workout_exercise_removed": {
        const s = slots.get(e.payload.slotId);
        if (s) s.removed = true;
        break;
      }
      case "workout_block_created": {
        const { blockId, blockType, position, title } = e.payload;
        blocksById.set(blockId, {
          blockType,
          position,
          title: title ?? inferBlockTitle(blockId),
        });
        break;
      }
      case "workout_block_updated": {
        const { blockId, patch } = e.payload;
        const existing = blocksById.get(blockId);
        const position = existing?.position ?? inferBlockSortKey(blockId);
        const blockType = patch.blockType ?? existing?.blockType ?? inferBlockType(blockId) ?? "sets";
        const title = patch.title ?? existing?.title ?? inferBlockTitle(blockId);
        blocksById.set(blockId, { blockType, position, title });
        break;
      }
      case "workout_block_removed": {
        removedBlockIds.add(e.payload.blockId);
        break;
      }
      case "strength_set_logged": {
        const slot = slots.get(e.payload.slotId);
        if (!slot || slot.removed) break;
        slot.setsById.set(e.payload.setId, e);
        break;
      }
      case "strength_set_removed": {
        for (const slot of slots.values()) {
          if (slot.setsById.has(e.payload.setId)) {
            slot.removedSetIds.add(e.payload.setId);
            break;
          }
        }
        break;
      }
      case "strength_set_corrected": {
        // corrections only apply if base exists; we still store correction payload for later resolution
        for (const slot of slots.values()) {
          if (slot.setsById.has(e.payload.setId)) {
            slot.correctionsBySetId.set(e.payload.setId, e.payload);
            break;
          }
        }
        break;
      }
      default: {
        // exhaustive guard
        const _never: never = e;
        void _never;
      }
    }
  }

  const exercises = [...slots.values()]
    .sort((a, b) => a.position - b.position || a.slotId.localeCompare(b.slotId))
    .map((s) => {
      const sets = [...s.setsById.values()]
        .filter((log) => !s.removedSetIds.has(log.payload.setId))
        .sort((a, b) => a.payload.ordinal - b.payload.ordinal || a.eventId.localeCompare(b.eventId))
        .map((log) => {
          const patch = s.correctionsBySetId.get(log.payload.setId)?.patch ?? null;
          const reps = patch?.reps ?? log.payload.reps;
          const loadKg = (patch?.loadKg ?? log.payload.loadKg) ?? null;
          const rpe = (patch?.rpe ?? log.payload.rpe) ?? null;
          const tempo = (patch?.tempo ?? log.payload.tempo) ?? null;
          const isWarmup = patch?.isWarmup ?? log.payload.isWarmup ?? false;
          const note = (patch?.note ?? log.payload.note) ?? null;
          return {
            setId: log.payload.setId,
            ordinal: log.payload.ordinal,
            reps,
            loadKg,
            rpe,
            tempo,
            isWarmup,
            note,
            occurredAt: log.occurredAt,
          };
        });

      return {
        slotId: s.slotId,
        blockId: s.blockId,
        exerciseId: s.exerciseId,
        position: s.position,
        removed: s.removed,
        sets,
      };
    });

  const blockIdsFromExercises = new Set<string>();
  for (const s of slots.values()) {
    if (s.blockId != null && !removedBlockIds.has(s.blockId)) blockIdsFromExercises.add(s.blockId);
  }
  for (const bid of blockIdsFromExercises) {
    if (!blocksById.has(bid)) {
      blocksById.set(bid, {
        blockType: inferBlockType(bid) ?? "sets",
        position: inferBlockSortKey(bid),
        title: inferBlockTitle(bid),
      });
    }
  }

  const blocks = [...blocksById.entries()]
    .sort(
      (a, b) =>
        a[1].position - b[1].position || a[0].localeCompare(b[0]),
    )
    .map(([blockId, { blockType, position, title }]) => ({
      blockId,
      blockType,
      position,
      title,
      removed: removedBlockIds.has(blockId),
    }));

  if (startedAt === null) {
    startedAt = sorted[0]!.occurredAt;
  }

  return {
    ownerUid,
    sessionId,
    status,
    startedAt,
    blocks,
    exercises,
    notes,
    eventCount: sorted.length,
  };
}
