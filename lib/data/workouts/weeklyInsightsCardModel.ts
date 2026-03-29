import type { WeeklyStrengthCardModel } from "@/lib/data/workouts/weeklyStrengthCardModel";
import type { MuscleGroup } from "@/lib/workouts/exercises/taxonomy";
import type { WeeklyInsightDestination } from "@/lib/workouts/navigation/strengthAnalyticsNavigationIntent";

/** User-facing insight categories for the Weekly Insights card. */
export type WeeklyInsightKind = "balance" | "trend" | "focus";

export type WeeklyInsightItem = {
  kind: WeeklyInsightKind;
  message: string;
  /** Where Strength Analytics should land when this row is tapped. */
  destination: WeeklyInsightDestination;
};

export type WeeklyInsightsCardModel = {
  insights: readonly WeeklyInsightItem[];
  fallbackMessage: string;
};

const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  quads: "Quads",
  hamstrings: "Hamstrings",
  glutes: "Glutes",
  calves: "Calves",
  core: "Core",
};

const ALL_GROUPS: readonly MuscleGroup[] = [
  "chest",
  "back",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "quads",
  "hamstrings",
  "glutes",
  "calves",
  "core",
];

/** Imbalance callout when the larger side is at least this multiple of the smaller (both sides > 0). */
const IMBALANCE_RATIO_MIN = 1.75;
/** Week-over-week total volume change magnitude for a trend line. */
const TREND_TOTAL_REL_MIN = 0.18;
/** Week-over-week single-group volume change for a muscle trend. */
const TREND_GROUP_REL_MIN = 0.22;
/** Minimum kg on both sides of a pair to emit a balance ratio (reduces noisy ratios). */
const BALANCE_MIN_SIDE_KG = 120;
/** Minimum larger-side kg when the smaller side is zero (focus / imbalance context). */
const PAIR_FOCUS_MIN_DOMINANT_KG = 350;
/** Minimum weekly total volume before muscle “missing” callouts. */
const MIN_TOTAL_KG_FOR_FOCUS = 600;
/** Leg stimulus proxy: sum of these must exceed this for calf / hamstring focus when legs are trained. */
const MIN_LEG_VOLUME_FOR_LOWER_FOCUS = 250;

const FALLBACK_WITH_WORK = "Nice work this week — consistency beats perfection.";
const FALLBACK_QUIET =
  "Log strength sessions to unlock weekly balance, trends, and focus cues.";

type Candidate = {
  kind: WeeklyInsightKind;
  message: string;
  score: number;
  /** Collapse competing messages (e.g. one quad/ham story). */
  tag: string;
  destination: WeeklyInsightDestination;
};

function volumeMap(model: WeeklyStrengthCardModel): Map<MuscleGroup, number> {
  const m = new Map<MuscleGroup, number>();
  for (const g of ALL_GROUPS) m.set(g, 0);
  for (const row of model.muscleGroups) {
    m.set(row.muscleGroup, row.totalVolume);
  }
  return m;
}

function formatRatio(larger: number, smaller: number): string {
  if (!(smaller > 0) || !Number.isFinite(larger) || !Number.isFinite(smaller)) return "—";
  const r = Math.round((larger / smaller) * 10) / 10;
  return r.toFixed(1);
}

function formatPctChange(rel: number): string {
  const pct = Math.round(Math.abs(rel) * 100);
  return `${pct}%`;
}

function pushBalancePair(
  out: Candidate[],
  vol: Map<MuscleGroup, number>,
  a: MuscleGroup,
  b: MuscleGroup,
  tag: string,
): void {
  const va = vol.get(a) ?? 0;
  const vb = vol.get(b) ?? 0;
  if (va <= 0 || vb <= 0) return;
  if (va < BALANCE_MIN_SIDE_KG || vb < BALANCE_MIN_SIDE_KG) return;
  const hi = va >= vb ? a : b;
  const lo = va >= vb ? b : a;
  const hiV = Math.max(va, vb);
  const loV = Math.min(va, vb);
  const ratio = hiV / loV;
  if (ratio < IMBALANCE_RATIO_MIN) return;
  const labelHi = MUSCLE_GROUP_LABELS[hi];
  const labelLo = MUSCLE_GROUP_LABELS[lo];
  const ratioLabel = formatRatio(hiV, loV);
  const score = 80 + Math.min(20, Math.floor((ratio - IMBALANCE_RATIO_MIN) * 40));
  out.push({
    kind: "balance",
    message: `${labelHi} volume is ${ratioLabel}× ${labelLo.toLowerCase()} this week.`,
    score,
    tag,
    destination: {
      section: "weekly_muscle_group",
      emphasis: "balance",
      muscleGroup: hi,
    },
  });
}

function pushBalancedPair(
  out: Candidate[],
  vol: Map<MuscleGroup, number>,
  a: MuscleGroup,
  b: MuscleGroup,
  tag: string,
): void {
  const va = vol.get(a) ?? 0;
  const vb = vol.get(b) ?? 0;
  if (va < BALANCE_MIN_SIDE_KG || vb < BALANCE_MIN_SIDE_KG) return;
  const hi = Math.max(va, vb);
  const lo = Math.min(va, vb);
  if (lo <= 0) return;
  const ratio = hi / lo;
  if (ratio > 1.2) return;
  out.push({
    kind: "balance",
    message: `${MUSCLE_GROUP_LABELS[a]} and ${MUSCLE_GROUP_LABELS[b].toLowerCase()} volume are balanced this week.`,
    score: 32,
    tag,
    destination: { section: "weekly_muscle_group", emphasis: "balance" },
  });
}

function legVolume(vol: Map<MuscleGroup, number>): number {
  return (vol.get("quads") ?? 0) + (vol.get("hamstrings") ?? 0) + (vol.get("glutes") ?? 0) + (vol.get("calves") ?? 0);
}

function collectCandidates(
  current: WeeklyStrengthCardModel,
  previous: WeeklyStrengthCardModel | null,
): Candidate[] {
  const candidates: Candidate[] = [];
  const vol = volumeMap(current);
  const total = current.totalVolume;

  pushBalancePair(candidates, vol, "quads", "hamstrings", "pair:quads:hamstrings");
  pushBalancePair(candidates, vol, "chest", "back", "pair:chest:back");
  pushBalancePair(candidates, vol, "biceps", "triceps", "pair:biceps:triceps");

  const coveredPairs = new Set(
    candidates.filter((c) => c.kind === "balance" && c.tag.startsWith("pair:")).map((c) => c.tag),
  );

  // Focus: missing direct work when the week has real volume
  if (total >= MIN_TOTAL_KG_FOR_FOCUS) {
    const quads = vol.get("quads") ?? 0;
    const hamstrings = vol.get("hamstrings") ?? 0;
    const calves = vol.get("calves") ?? 0;
    const legs = legVolume(vol);

    if (hamstrings <= 0 && quads >= PAIR_FOCUS_MIN_DOMINANT_KG && !coveredPairs.has("pair:quads:hamstrings")) {
      candidates.push({
        kind: "focus",
        message: "No direct hamstring work logged this week.",
        score: 78,
        tag: "focus:hamstrings:zero",
        destination: { section: "weekly_muscle_group", emphasis: "focus", muscleGroup: "hamstrings" },
      });
    }

    if (calves <= 0 && legs >= MIN_LEG_VOLUME_FOR_LOWER_FOCUS) {
      candidates.push({
        kind: "focus",
        message: "No direct calf work logged this week.",
        score: 72,
        tag: "focus:calves:zero",
        destination: { section: "weekly_muscle_group", emphasis: "focus", muscleGroup: "calves" },
      });
    }

    const chest = vol.get("chest") ?? 0;
    const back = vol.get("back") ?? 0;
    if (chest <= 0 && back >= PAIR_FOCUS_MIN_DOMINANT_KG && !coveredPairs.has("pair:chest:back")) {
      candidates.push({
        kind: "focus",
        message: "No direct chest work logged this week.",
        score: 74,
        tag: "focus:chest:zero",
        destination: { section: "weekly_muscle_group", emphasis: "focus", muscleGroup: "chest" },
      });
    }
    if (back <= 0 && chest >= PAIR_FOCUS_MIN_DOMINANT_KG && !coveredPairs.has("pair:chest:back")) {
      candidates.push({
        kind: "focus",
        message: "No direct back work logged this week.",
        score: 74,
        tag: "focus:back:zero",
        destination: { section: "weekly_muscle_group", emphasis: "focus", muscleGroup: "back" },
      });
    }
  }

  // Trends: total volume vs previous week
  if (previous != null && previous.totalVolume > 0 && total > 0) {
    const rel = (total - previous.totalVolume) / previous.totalVolume;
    if (rel >= TREND_TOTAL_REL_MIN) {
      candidates.push({
        kind: "trend",
        message: `Total strength volume is up ${formatPctChange(rel)} vs last week.`,
        score: 58 + Math.min(12, Math.floor((rel - TREND_TOTAL_REL_MIN) * 100)),
        tag: "trend:total:up",
        destination: { section: "weekly_strength", emphasis: "trend" },
      });
    } else if (rel <= -TREND_TOTAL_REL_MIN) {
      candidates.push({
        kind: "trend",
        message: `Total strength volume is down ${formatPctChange(rel)} vs last week.`,
        score: 58 + Math.min(12, Math.floor((-rel - TREND_TOTAL_REL_MIN) * 100)),
        tag: "trend:total:down",
        destination: { section: "weekly_strength", emphasis: "trend" },
      });
    }
  }

  // Trends: largest muscle-group swing
  if (previous != null) {
    const prevVol = volumeMap(previous);
    let best: { group: MuscleGroup; rel: number; cur: number; prev: number } | null = null;
    for (const g of ALL_GROUPS) {
      const cur = vol.get(g) ?? 0;
      const p = prevVol.get(g) ?? 0;
      if (p <= 0 && cur <= 0) continue;
      const rel = p > 0 ? (cur - p) / p : cur >= 400 ? 1 : 0;
      if (Math.abs(rel) < TREND_GROUP_REL_MIN) continue;
      if (cur < 200 && p < 200) continue;
      if (best == null || Math.abs(rel) > Math.abs(best.rel)) {
        best = { group: g, rel, cur, prev: p };
      }
    }
    if (best != null) {
      const label = MUSCLE_GROUP_LABELS[best.group];
      const down = best.rel < 0;
      candidates.push({
        kind: "trend",
        message: down
          ? `${label} volume is down ${formatPctChange(best.rel)} vs last week.`
          : `${label} volume is up ${formatPctChange(best.rel)} vs last week.`,
        score: 52 + Math.min(15, Math.floor(Math.abs(best.rel) * 50)),
        tag: `trend:group:${best.group}:${down ? "down" : "up"}`,
        destination: {
          section: "weekly_muscle_group",
          emphasis: "trend",
          muscleGroup: best.group,
        },
      });
    }
  }

  // Low-priority “balanced” positive only if we still need filler — applied after sort; add now with low score
  pushBalancedPair(candidates, vol, "chest", "back", "balance:chest:back:even");

  candidates.sort((a, b) => b.score - a.score);

  const picked: Candidate[] = [];
  const usedTags = new Set<string>();
  const usedPairStory = new Set<string>();

  for (const c of candidates) {
    if (picked.length >= 3) break;
    if (usedTags.has(c.tag)) continue;
    if (c.tag.startsWith("focus:hamstrings") && usedPairStory.has("pair:quads:hamstrings")) continue;
    if (c.tag.startsWith("focus:chest") && usedPairStory.has("pair:chest:back")) continue;
    if (c.tag.startsWith("focus:back") && usedPairStory.has("pair:chest:back")) continue;
    if (c.tag.startsWith("pair:") && usedPairStory.has(c.tag)) continue;

    picked.push(c);
    usedTags.add(c.tag);
    if (c.tag.startsWith("pair:")) usedPairStory.add(c.tag);
  }

  return picked;
}

/**
 * Builds up to three coach-style insights from this week’s and last week’s
 * {@link WeeklyStrengthCardModel} (classification-first volume already applied there).
 */
export function buildWeeklyInsightsCardModel(
  currentWeek: WeeklyStrengthCardModel,
  previousWeek: WeeklyStrengthCardModel | null,
): WeeklyInsightsCardModel {
  const emptyWeek = currentWeek.totalWorkouts <= 0 && currentWeek.totalVolume <= 0;
  if (emptyWeek) {
    return { insights: [], fallbackMessage: FALLBACK_QUIET };
  }

  const raw = collectCandidates(currentWeek, previousWeek);
  const insights: WeeklyInsightItem[] = raw
    .slice(0, 3)
    .map(({ kind, message, destination }) => ({ kind, message, destination }));

  if (insights.length > 0) {
    return { insights, fallbackMessage: FALLBACK_WITH_WORK };
  }

  return { insights: [], fallbackMessage: FALLBACK_WITH_WORK };
}
