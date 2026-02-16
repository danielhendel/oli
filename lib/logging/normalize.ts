import type {
  EventMeta,
  EventType,
  WorkoutPayload, WorkoutExercise, WorkoutSet,
  CardioPayload, CardioLap, CardioInterval, CardioStreams, CardioSummary, CardioRoute,
  NutritionPayload, FoodEntry, FoodItem, NutritionTotals,
  RecoveryPayload, SleepStage, RecoverySleep, RecoveryPhysio, RecoveryReadiness,
} from "./schemas";

/** ------- tiny helpers ------- */
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const asNum = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const asStr = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined);
const asArr = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/** ---------- Workout ---------- */
export function normalizeWorkout(raw: unknown): WorkoutPayload {
  const out: WorkoutExercise[] = [];

  if (isObj(raw)) {
    const xs = asArr<unknown>((raw as Record<string, unknown>).exercises);

    for (const item of xs) {
      if (!isObj(item)) continue;

      const name = asStr(item.name) ?? "Exercise";
      const setsIn = asArr<unknown>(item.sets);

      const sets: WorkoutSet[] = setsIn.map((s) => {
        const set: WorkoutSet = {};
        if (isObj(s)) {
          // reps → clamp to >= 0
          const repsNum = asNum(s.reps);
          const reps = clampNonNeg(repsNum);
          if (reps !== undefined) set.reps = reps;

          // weightKg (or legacy 'weight') → clamp to >= 0
          const wNum = asNum((s as Record<string, unknown>).weightKg ?? (s as Record<string, unknown>).weight);
          const weightKg = clampNonNeg(wNum);
          if (weightKg !== undefined) set.weightKg = weightKg;

          // rpe → clamp to [1..10]
          const rpeNum = asNum(s.rpe);
          const rpe = clampRange(rpeNum, 1, 10);
          if (rpe !== undefined) set.rpe = rpe;
        }
        return set;
      });

      const ex: WorkoutExercise = { name, sets };
      const id = asStr((item as Record<string, unknown>).id);
      if (id) ex.id = id;

      out.push(ex);
    }
  }

  const outPayload: WorkoutPayload = { exercises: out };
  const notes = isObj(raw) ? asStr(raw["notes"]) : undefined;
  if (notes) outPayload.notes = notes;

  return outPayload;
}


/** ---------- Cardio ---------- */
export function normalizeCardio(raw: unknown): CardioPayload {
  const modality = isObj(raw) ? asStr(raw["modality"]) : undefined;

  let summary: CardioSummary | undefined;
  const summaryRaw = isObj(raw) ? raw["summary"] : undefined;
  if (isObj(summaryRaw)) {
    summary = {};
    const dk = clampNonNeg(asNum(summaryRaw["distanceKm"]));
    const dm = clampNonNeg(asNum(summaryRaw["durationMs"]));
    const eg = clampNonNeg(asNum(summaryRaw["elevationGainM"]));
    const hr = clampNonNeg(asNum(summaryRaw["avgHr"]));
    const pace = clampNonNeg(asNum(summaryRaw["avgPaceSecPerKm"]));
    const rpe = clampRange(asNum(summaryRaw["rpe"]), 1, 10);
    if (dk !== undefined) summary.distanceKm = dk;
    if (dm !== undefined) summary.durationMs = dm;
    if (eg !== undefined) summary.elevationGainM = eg;
    if (hr !== undefined) summary.avgHr = hr;
    if (pace !== undefined) summary.avgPaceSecPerKm = pace;
    if (rpe !== undefined) summary.rpe = rpe;
    if (Object.keys(summary).length === 0) summary = undefined;
  }

  const laps: CardioLap[] = [];
  if (isObj(raw)) {
    for (const l of asArr<unknown>(raw["laps"])) {
      if (!isObj(l)) continue;
      const idx = asNum(l["idx"]);
      const lap: CardioLap = { idx: typeof idx === "number" ? idx : laps.length };
      const dk = clampNonNeg(asNum(l["distanceKm"]));
      const dm = clampNonNeg(asNum(l["durationMs"]));
      const hr = clampNonNeg(asNum(l["avgHr"]));
      const pw = clampNonNeg(asNum(l["avgPowerW"]));
      if (dk !== undefined) lap.distanceKm = dk;
      if (dm !== undefined) lap.durationMs = dm;
      if (hr !== undefined) lap.avgHr = hr;
      if (pw !== undefined) lap.avgPowerW = pw;
      laps.push(lap);
    }
  }

  const intervals: CardioInterval[] = [];
  if (isObj(raw)) {
    for (const it of asArr<unknown>(raw["intervals"])) {
      if (!isObj(it)) continue;
      const interval: CardioInterval = {};
      const label = asStr(it["label"]);
      const target = asStr(it["target"]);
      if (label) interval.label = label;
      if (target) interval.target = target;

      const actualRaw = isObj(it["actual"]) ? it["actual"] : undefined;
      if (actualRaw) {
        const a: NonNullable<CardioInterval["actual"]> = {};
        const dm = clampNonNeg(asNum(actualRaw["durationMs"]));
        const dk = clampNonNeg(asNum(actualRaw["distanceKm"]));
        const hr = clampNonNeg(asNum(actualRaw["avgHr"]));
        const pw = clampNonNeg(asNum(actualRaw["avgPowerW"]));
        if (dm !== undefined) a.durationMs = dm;
        if (dk !== undefined) a.distanceKm = dk;
        if (hr !== undefined) a.avgHr = hr;
        if (pw !== undefined) a.avgPowerW = pw;
        if (Object.keys(a).length) interval.actual = a;
      }
      intervals.push(interval);
    }
  }

  let route: CardioRoute | undefined;
  const routeRaw = isObj(raw) ? raw["route"] : undefined;
  if (isObj(routeRaw)) {
    const r: CardioRoute = {};
    const poly = asStr(routeRaw["polyline"]);
    const hz = clampNonNeg(asNum(routeRaw["samplingHz"]));
    const ref = asStr(routeRaw["pointsRef"]);
    if (poly) r.polyline = poly;
    if (hz !== undefined) r.samplingHz = hz;
    if (ref) r.pointsRef = ref;
    if (Object.keys(r).length) route = r;
  }

  let streams: CardioStreams | undefined;
  const streamsRaw = isObj(raw) ? raw["streams"] : undefined;
  if (isObj(streamsRaw)) {
    const s: CardioStreams = {};
    const hr = filterNums(asArr<number>(streamsRaw["hr"]));
    const pw = filterNums(asArr<number>(streamsRaw["powerW"]));
    const cad = filterNums(asArr<number>(streamsRaw["cadence"]));
    const pace = filterNums(asArr<number>(streamsRaw["paceSecPerKm"]));
    if (hr.length) s.hr = hr;
    if (pw.length) s.powerW = pw;
    if (cad.length) s.cadence = cad;
    if (pace.length) s.paceSecPerKm = pace;
    if (Object.keys(s).length) streams = s;
  }

  const out: CardioPayload = { modality: (modality as CardioPayload["modality"]) ?? "run" };
  if (summary) out.summary = summary;
  if (laps.length) out.laps = laps;
  if (intervals.length) out.intervals = intervals;
  if (route) out.route = route;
  if (streams) out.streams = streams;
  const notes = isObj(raw) ? asStr(raw["notes"]) : undefined;
  if (notes) out.notes = notes;
  return out;
}

/** ---------- Nutrition ---------- */
export function normalizeNutrition(raw: unknown): NutritionPayload {
  const entries: FoodEntry[] = [];
  if (isObj(raw)) {
    for (const e of asArr<unknown>(raw["entries"])) {
      if (!isObj(e)) continue;

      let inlineItem: FoodItem | undefined;
      const inlineRaw = isObj(e["inlineItem"]) ? (e["inlineItem"] as Record<string, unknown>) : undefined;
      if (inlineRaw) {
        const item: FoodItem = { name: asStr(inlineRaw["name"]) ?? "Food" };
        const brand = asStr(inlineRaw["brand"]);
        const barcode = asStr(inlineRaw["barcode"]);
        const servingQty = clampNonNeg(asNum(inlineRaw["servingQty"]));
        const servingUnit = asStr(inlineRaw["servingUnit"]);
        const nutrients = normalizeTotals(inlineRaw["nutrients"]);
        if (brand) item.brand = brand;
        if (barcode) item.barcode = barcode;
        if (servingQty !== undefined) item.servingQty = servingQty;
        if (servingUnit) item.servingUnit = servingUnit;
        if (nutrients && Object.keys(nutrients).length) item.nutrients = nutrients;
        inlineItem = item;
      }

      const entry: FoodEntry = {};
      const itemId = asStr(e["itemId"]);
      const grams = clampNonNeg(asNum(e["grams"]));
      const servings = clampNonNeg(asNum(e["servings"]));
      const mealTag = asStr(e["mealTag"]) as FoodEntry["mealTag"] | undefined;
      const notes = asStr(e["notes"]);
      if (itemId) entry.itemId = itemId;
      if (inlineItem) entry.inlineItem = inlineItem;
      if (grams !== undefined) entry.grams = grams;
      if (servings !== undefined) entry.servings = servings;
      if (mealTag) entry.mealTag = mealTag;
      if (notes) entry.notes = notes;

      entries.push(entry);
    }
  }

  const out: NutritionPayload = {};
  if (entries.length) out.entries = entries;

  const totals = isObj(raw) ? normalizeTotals((raw as Record<string, unknown>)["totals"]) : undefined;
  if (totals && Object.keys(totals).length) out.totals = totals;

  const notes = isObj(raw) ? asStr(raw["notes"]) : undefined;
  if (notes) out.notes = notes;

  return out;
}

function normalizeTotals(raw: unknown): NutritionTotals | undefined {
  if (!isObj(raw)) return undefined;
  const t: NutritionTotals = {};
  const kcal = clampNonNeg(asNum(raw["kcal"]));
  const proteinG = clampNonNeg(asNum(raw["proteinG"]));
  const carbG = clampNonNeg(asNum(raw["carbG"]));
  const fatG = clampNonNeg(asNum(raw["fatG"]));
  const fiberG = clampNonNeg(asNum(raw["fiberG"]));
  const sodiumMg = clampNonNeg(asNum(raw["sodiumMg"]));
  if (kcal !== undefined) t.kcal = kcal;
  if (proteinG !== undefined) t.proteinG = proteinG;
  if (carbG !== undefined) t.carbG = carbG;
  if (fatG !== undefined) t.fatG = fatG;
  if (fiberG !== undefined) t.fiberG = fiberG;
  if (sodiumMg !== undefined) t.sodiumMg = sodiumMg;
  return t;
}

/** ---------- Recovery ---------- */
export function normalizeRecovery(raw: unknown): RecoveryPayload {
  const out: RecoveryPayload = {};

  if (isObj(raw)) {
    const sleepRaw = raw["sleep"];
    if (isObj(sleepRaw)) {
      const sleep: RecoverySleep = {};
      const totalMin = clampNonNeg(asNum(sleepRaw["totalMin"]));
      const efficiency = clampRange(asNum(sleepRaw["efficiency"]), 0, 1);
      const stages: SleepStage[] = [];
      for (const st of asArr<unknown>(sleepRaw["stages"])) {
        if (!isObj(st)) continue;
        const start = asStr(st["start"]);
        const end = asStr(st["end"]);
        const stage = asStr(st["stage"]) as SleepStage["stage"] | undefined;
        if (start && end && stage) stages.push({ start, end, stage });
      }
      if (totalMin !== undefined) sleep.totalMin = totalMin;
      if (efficiency !== undefined) sleep.efficiency = efficiency;
      if (stages.length) sleep.stages = stages;
      if (Object.keys(sleep).length) out.sleep = sleep;
    }

    const physioRaw = raw["physio"];
    if (isObj(physioRaw)) {
      const phys: RecoveryPhysio = {};
      const rhr = clampNonNeg(asNum(physioRaw["rhrBpm"]));
      const hrv = clampNonNeg(asNum(physioRaw["hrvMs"]));
      const rr = clampNonNeg(asNum(physioRaw["respRate"]));
      const temp = asNum(physioRaw["skinTempCDelta"]); // delta can be negative; don't clamp
      if (rhr !== undefined) phys.rhrBpm = rhr;
      if (hrv !== undefined) phys.hrvMs = hrv;
      if (rr !== undefined) phys.respRate = rr;
      if (temp !== undefined) phys.skinTempCDelta = temp;
      if (Object.keys(phys).length) out.physio = phys;
    }

    const readinessRaw = raw["readiness"];
    if (isObj(readinessRaw)) {
      const ready: RecoveryReadiness = {};
      const score = clampNonNeg(asNum(readinessRaw["score"]));
      const strain = clampNonNeg(asNum(readinessRaw["strain"]));
      const notes = asStr(readinessRaw["notes"]);
      if (score !== undefined) ready.score = score;
      if (strain !== undefined) ready.strain = strain;
      if (notes) ready.notes = notes;
      if (Object.keys(ready).length) out.readiness = ready;
    }

    const naps: Array<{ start: string; end: string }> = [];
    for (const n of asArr<unknown>(raw["naps"])) {
      if (!isObj(n)) continue;
      const start = asStr(n["start"]);
      const end = asStr(n["end"]);
      if (start && end) naps.push({ start, end });
    }
    if (naps.length) out.naps = naps;

    const subjRaw = raw["subjective"];
    if (isObj(subjRaw)) {
      const subj: NonNullable<RecoveryPayload["subjective"]> = {};
      const e = clampRange(asNum(subjRaw["energy1to5"]), 1, 5);
      const s = clampRange(asNum(subjRaw["stress1to5"]), 1, 5);
      const so = clampRange(asNum(subjRaw["soreness1to5"]), 1, 5);
      const m = clampRange(asNum(subjRaw["mood1to5"]), 1, 5);
      if (e !== undefined) subj.energy1to5 = e;
      if (s !== undefined) subj.stress1to5 = s;
      if (so !== undefined) subj.soreness1to5 = so;
      if (m !== undefined) subj.mood1to5 = m;
      if (Object.keys(subj).length) out.subjective = subj;
    }

    const notes = asStr(raw["notes"]);
    if (notes) out.notes = notes;
  }

  return out;
}

/** ---------- Validation + Meta ---------- */
export function assertValidEvent(type: EventType, payload: unknown): void {
  const nonNeg = (n?: number) => n === undefined || n >= 0;
  if (type === "workout") {
    const w = payload as WorkoutPayload;
    if (!w || !Array.isArray(w.exercises)) throw new Error("workout.exercises missing");
  }
  if (type === "cardio") {
    const c = payload as CardioPayload;
    if (!c || !c.modality) throw new Error("cardio.modality missing");
    if (c.summary && !nonNeg(c.summary.durationMs)) throw new Error("cardio.duration negative");
  }
  // nutrition & recovery: optional fields only; no hard requirements
}

export function normalizeEvent(
  type: EventType,
  rawPayload: unknown,
  meta: Partial<EventMeta>
): { payload: WorkoutPayload | CardioPayload | NutritionPayload | RecoveryPayload; meta: EventMeta } {
  const payload =
    type === "workout"
      ? normalizeWorkout(rawPayload)
      : type === "cardio"
      ? normalizeCardio(rawPayload)
      : type === "nutrition"
      ? normalizeNutrition(rawPayload)
      : normalizeRecovery(rawPayload);

  const metaOut: EventMeta = {
    source: meta.source ?? "manual",
    version: 1,
  };
  if (typeof meta.draft === "boolean") metaOut.draft = meta.draft;
  if (meta.idempotencyKey) metaOut.idempotencyKey = meta.idempotencyKey;
  if (meta.createdAt) metaOut.createdAt = meta.createdAt;
  if (meta.editedAt) metaOut.editedAt = meta.editedAt;

  assertValidEvent(type, payload);
  return { payload, meta: metaOut };
}

/** ------- helpers ------- */
function clampNonNeg(n?: number): number | undefined {
  if (n === undefined) return undefined;
  return n < 0 ? 0 : n;
}
function clampRange(n: number | undefined, min: number, max: number): number | undefined {
  if (n === undefined) return undefined;
  if (!Number.isFinite(n)) return undefined;
  if (n < min) return min;
  if (n > max) return max;
  return n;
}
function filterNums(arr: number[]): number[] {
  return arr.filter((n) => typeof n === "number" && Number.isFinite(n));
}
