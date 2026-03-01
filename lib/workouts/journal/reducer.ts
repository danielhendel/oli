import type {
  ReducedSessionV1,
  WorkoutEventV1,
  WorkoutSessionStatus,
  StrengthSetLogged,
  StrengthSetCorrected,
} from "./types";

type ExerciseSlotState = {
  slotId: string;
  exerciseId: string;
  position: number;
  removed: boolean;
  // base set logs by setId
  setsById: Map<string, StrengthSetLogged>;
  // corrections by setId (last write wins, deterministically by sorted order)
  correctionsBySetId: Map<string, StrengthSetCorrected["payload"]>;
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

export function reduceWorkoutSessionV1(events: WorkoutEventV1[]): ReducedSessionV1 {
  const sorted = stableSortEvents(events);
  if (sorted.length === 0) {
    return {
      ownerUid: "unknown",
      sessionId: "unknown",
      status: DEFAULT_STATUS,
      exercises: [],
      notes: [],
      eventCount: 0,
    };
  }

  const ownerUid = sorted[0]!.ownerUid;
  const sessionId = sorted[0]!.sessionId;
  let status: WorkoutSessionStatus = DEFAULT_STATUS;
  const notes: string[] = [];
  const slots = new Map<string, ExerciseSlotState>();

  for (const e of sorted) {
    // Fail-closed: ignore events that do not match the session envelope
    if (e.ownerUid !== ownerUid || e.sessionId !== sessionId) continue;

    switch (e.kind) {
      case "workout_session_state_changed": {
        status = e.payload.to;
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
          exerciseId: e.payload.exerciseId,
          position: e.payload.position,
          removed: false,
          setsById: new Map(),
          correctionsBySetId: new Map(),
        };
        // Deterministic: last add wins for exerciseId/position if same slotId re-added
        next.exerciseId = e.payload.exerciseId;
        next.position = e.payload.position;
        next.removed = false;
        slots.set(next.slotId, next);
        break;
      }
      case "workout_exercise_removed": {
        const s = slots.get(e.payload.slotId);
        if (s) s.removed = true;
        break;
      }
      case "strength_set_logged": {
        const slot = slots.get(e.payload.slotId);
        if (!slot || slot.removed) break;
        slot.setsById.set(e.payload.setId, e);
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
        exerciseId: s.exerciseId,
        position: s.position,
        removed: s.removed,
        sets,
      };
    });

  return {
    ownerUid,
    sessionId,
    status,
    exercises,
    notes,
    eventCount: sorted.length,
  };
}
