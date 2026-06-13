/**
 * Pure, deterministic food text matching (Food Graph search, Sprint 1 Phase B).
 *
 * This mirrors the proven exercise-search algorithm in
 * `lib/workouts/exercises/search.ts` (bounded Levenshtein + token scoring).
 * It is re-implemented here rather than imported because `services/api` is a
 * separate TypeScript project that only references `@oli/contracts` — it cannot
 * import from the client `lib/` tree under `tsc -b`. The algorithm is kept
 * byte-for-byte equivalent so behavior is consistent across the app.
 *
 * No I/O, no `any`, fully deterministic.
 */

/** Match quality, ordered best→worst. */
export type FoodMatchClass = "exact" | "token" | "fuzzy" | "none";

export interface FoodMatchResult {
  matchClass: FoodMatchClass;
  /** Higher is a better match within a class. */
  score: number;
}

/** Normalize: lowercase, underscores→space, strip non `[a-z0-9 ]`, collapse spaces. */
export function normalizeFoodText(s: string): string {
  return s
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeFoodText(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 0);
}

/** Bounded Levenshtein with early exit. Returns distance if ≤ maxDist, else null. */
export function boundedLevenshtein(a: string, b: string, maxDist: number): number | null {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > maxDist) return null;
  let prev: number[] = Array.from({ length: m + 1 }, (_, i) => i);
  for (let i = 1; i <= n; i++) {
    const curr: number[] = [i];
    for (let j = 1; j <= m; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(prev[j - 1]! + cost, prev[j]! + 1, curr[j - 1]! + 1);
    }
    if (Math.min(...curr) > maxDist) return null;
    prev = curr;
  }
  const d = prev[m];
  if (d === undefined) return null;
  return d <= maxDist ? d : null;
}

/** Max edit distance for a query token length: <4→0, 4–5→1, ≥6→2. */
function maxEditDistanceForTokenLength(len: number): number {
  if (len < 4) return 0;
  if (len <= 5) return 1;
  return 2;
}

const SCORE_EXACT = 100;
const SCORE_PREFIX = 70;
const SCORE_EDIT = 40;
const SCORE_SUBSTRING = 20;

type TokenPairKind = "exact" | "near" | "fuzzy" | "none";

function scoreTokenPair(qt: string, ft: string): { score: number; kind: TokenPairKind } {
  if (qt === ft) return { score: SCORE_EXACT, kind: "exact" };
  if (ft.startsWith(qt) || qt.startsWith(ft)) return { score: SCORE_PREFIX, kind: "near" };
  if (qt.length >= 4) {
    const maxDist = maxEditDistanceForTokenLength(qt.length);
    const d = boundedLevenshtein(qt, ft, maxDist);
    if (d !== null) return { score: SCORE_EDIT, kind: "fuzzy" };
  }
  if (ft.includes(qt) || qt.includes(ft)) return { score: SCORE_SUBSTRING, kind: "near" };
  return { score: 0, kind: "none" };
}

/**
 * Score a normalized query against a single normalized field.
 * Fail-closed: if any query token has no match, the whole field scores `none`.
 */
export function scoreFoodFieldNormalized(queryNorm: string, fieldNorm: string): FoodMatchResult {
  if (queryNorm.length === 0 || fieldNorm.length === 0) return { matchClass: "none", score: 0 };
  if (queryNorm === fieldNorm) return { matchClass: "exact", score: 1000 };

  const queryTokens = tokenizeFoodText(queryNorm);
  const fieldTokens = tokenizeFoodText(fieldNorm);
  if (queryTokens.length === 0 || fieldTokens.length === 0) return { matchClass: "none", score: 0 };

  let sum = 0;
  let usedFuzzy = false;
  for (const qt of queryTokens) {
    let best = 0;
    let bestKind: TokenPairKind = "none";
    for (const ft of fieldTokens) {
      const pair = scoreTokenPair(qt, ft);
      if (pair.score > best) {
        best = pair.score;
        bestKind = pair.kind;
      }
    }
    if (best === 0) return { matchClass: "none", score: 0 };
    if (bestKind === "fuzzy") usedFuzzy = true;
    sum += best;
  }
  return { matchClass: usedFuzzy ? "fuzzy" : "token", score: sum };
}

/** Best match across multiple candidate fields (e.g. name, brand, tokens). */
export function bestFoodMatch(query: string, fields: readonly string[]): FoodMatchResult {
  const q = normalizeFoodText(query);
  if (q.length === 0) return { matchClass: "none", score: 0 };
  const order: Record<FoodMatchClass, number> = { exact: 0, token: 1, fuzzy: 2, none: 3 };
  let best: FoodMatchResult = { matchClass: "none", score: 0 };
  for (const field of fields) {
    const r = scoreFoodFieldNormalized(q, normalizeFoodText(field));
    if (order[r.matchClass] < order[best.matchClass]) {
      best = r;
    } else if (r.matchClass === best.matchClass && r.score > best.score) {
      best = r;
    }
  }
  return best;
}
