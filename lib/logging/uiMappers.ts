// lib/logging/uiMappers.ts
import type { EventDoc, UIEvent } from "./types";
import { tsToDate } from "./readEvents";

function timeHHMM(ms: number) {
  const d = new Date(ms);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function getAtMs(doc: EventDoc): number {
  // Some writers set atMs; some only set ts (Timestamp/Date/number).
  const maybe = doc as { atMs?: unknown; ts?: unknown };
  if (typeof maybe.atMs === "number") return maybe.atMs;
  const d = tsToDate(maybe.ts);
  return Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
}

export function mapToUI(doc: EventDoc): UIEvent {
  const atMs = getAtMs(doc);
  const time = timeHHMM(atMs);

  const payload = (doc.payload ?? {}) as Record<string, unknown>;
  let title = "";
  let subtitle = "";

  switch (doc.type) {
    case "workout": {
      const exs = Array.isArray(payload.exercises) ? (payload.exercises as Array<Record<string, unknown>>) : [];
      const first = exs[0] ?? {};
      const name = typeof first.name === "string" ? first.name : "Workout";
      const sets = Array.isArray(first.sets) ? (first.sets as unknown[]).length : 0;
      title = sets ? `${name} (${sets} ${sets === 1 ? "set" : "sets"})` : name;
      subtitle = "Manual";
      break;
    }
    case "cardio": {
      const dist = typeof payload.distanceKm === "number" ? `${payload.distanceKm} km` : null;
      const durMin =
        typeof payload.durationMs === "number" ? `${Math.round((payload.durationMs as number) / 60000)} min` : null;
      const rpe = typeof payload.rpe === "number" ? `RPE ${payload.rpe}` : null;
      title = "Cardio";
      subtitle = [dist, durMin, rpe].filter(Boolean).join(" • ");
      break;
    }
    case "nutrition": {
      const totals = (payload.totals as Record<string, unknown>) || {};
      const cals = typeof totals.calories === "number" ? totals.calories : 0;
      const protein = typeof totals.protein === "number" ? totals.protein : 0;
      title = "Nutrition";
      subtitle = `${cals} kcal · ${protein} g protein`;
      break;
    }
    case "recovery": {
      const sleep = typeof payload.sleepMin === "number" ? `${payload.sleepMin} min sleep` : null;
      const hrv = typeof payload.hrv === "number" ? `HRV ${payload.hrv}` : null;
      const rhr = typeof payload.rhr === "number" ? `RHR ${payload.rhr}` : null;
      title = "Recovery";
      subtitle = [sleep, hrv, rhr].filter(Boolean).join(" • ");
      break;
    }
    default:
      title = "Event";
  }

  return {
    id: doc.id,
    type: doc.type,
    title,
    subtitle,
    time,
    raw: doc,
  };
}
