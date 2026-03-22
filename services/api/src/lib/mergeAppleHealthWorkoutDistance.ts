import { rawEventDocSchema } from "@oli/contracts";
import type { IngestRawEventBody } from "../types/events";

/**
 * When POST /ingest hits an idempotency collision, the default behavior is no-op.
 * For historical Apple Health workouts ingested before distance was captured, the same
 * idempotency key + new payload with distanceMeters should merge distance onto the
 * existing raw doc (no duplicate doc, no second create).
 */
export async function mergeDistanceIntoExistingAppleHealthWorkoutIfNeeded(params: {
  body: IngestRawEventBody;
  existingData: unknown;
  update: (payload: Record<string, unknown>) => Promise<unknown>;
}): Promise<boolean> {
  const { body, existingData, update } = params;

  if (body.provider !== "apple_health" || body.kind !== "workout") {
    return false;
  }

  const incoming = body.payload;
  if (incoming == null || typeof incoming !== "object" || Array.isArray(incoming)) {
    return false;
  }
  const inc = incoming as Record<string, unknown>;
  const dm = inc["distanceMeters"];
  if (typeof dm !== "number" || !Number.isFinite(dm) || dm <= 0) {
    return false;
  }

  const parsedExisting = rawEventDocSchema.safeParse(existingData);
  if (!parsedExisting.success) {
    return false;
  }

  const doc = parsedExisting.data;
  if (doc.provider !== "apple_health" || doc.kind !== "workout") {
    return false;
  }

  const prev = doc.payload as Record<string, unknown>;
  const prevDm = prev["distanceMeters"];
  if (typeof prevDm === "number" && Number.isFinite(prevDm) && prevDm > 0) {
    return false;
  }

  const mergedPayload = { ...prev, distanceMeters: dm };
  const mergedDoc = { ...doc, payload: mergedPayload };
  const validatedMerged = rawEventDocSchema.safeParse(mergedDoc);
  if (!validatedMerged.success) {
    return false;
  }

  await update(validatedMerged.data.payload as Record<string, unknown>);
  return true;
}
