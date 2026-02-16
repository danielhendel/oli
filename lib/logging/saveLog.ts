// lib/logging/saveLog.ts
import type { AnyPayload } from "./writeEvent";
import { writeEvent } from "./writeEvent";
import {
  toWorkoutPayload,
  toCardioPayload,
  toNutritionPayload,
  toRecoveryPayload,
  ok,
  type ValidationResult,
  type WorkoutDraft,
  type CardioDraft,
  type NutritionDraft,
  type RecoveryDraft,
} from "./transformers";

export type SaveKind = "workout" | "cardio" | "nutrition" | "recovery";
export type SaveOpts = { ymd?: string; atMs?: number };

const fail = <T,>(path: string, message: string): ValidationResult<T> => ({
  ok: false,
  issues: [{ path, message }],
});

export async function saveLog(
  kind: SaveKind,
  draft: WorkoutDraft | CardioDraft | NutritionDraft | RecoveryDraft,
  uid: string,
  opts?: SaveOpts
): Promise<ValidationResult<{ id: string; payload: AnyPayload }>> {
  let validated: ValidationResult<AnyPayload>;
  switch (kind) {
    case "workout":
      validated = toWorkoutPayload(draft as WorkoutDraft);
      break;
    case "cardio":
      validated = toCardioPayload(draft as CardioDraft);
      break;
    case "nutrition":
      validated = toNutritionPayload(draft as NutritionDraft);
      break;
    case "recovery":
      validated = toRecoveryPayload(draft as RecoveryDraft);
      break;
    default:
      return fail("kind", "Unsupported kind");
  }
  if (!validated.ok) return validated as ValidationResult<{ id: string; payload: AnyPayload }>;

  const args: {
    uid: string;
    type: SaveKind;
    payload: AnyPayload;
    source: "manual";
    ymd?: string;
    atMs?: number;
  } = { uid, type: kind, payload: validated.data, source: "manual" };
  if (opts?.ymd) args.ymd = opts.ymd;
  if (typeof opts?.atMs === "number") args.atMs = opts.atMs;

  const wr = await writeEvent(args);
  return ok({ id: wr.id, payload: validated.data });
}
