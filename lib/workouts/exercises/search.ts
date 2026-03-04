import type { ExerciseCatalogItem } from "./catalog";

/** Normalize: lowercase, underscores to space, strip non [a-z0-9 ], collapse spaces. */
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(normalized: string): string[] {
  return normalized.split(" ").filter((t) => t.length > 0);
}

/** Bounded Levenshtein with early exit. Returns distance if <= maxDist, else null. */
function boundedLevenshtein(a: string, b: string, maxDist: number): number | null {
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

/** Max edit distance for query token length: 4-5 → 1, >=6 → 2. Only used when len >= 4. */
function maxEditDistanceForTokenLength(len: number): number {
  if (len < 4) return 0;
  if (len <= 5) return 1;
  return 2;
}

const SCORE_EXACT = 100;
const SCORE_PREFIX = 70;
const SCORE_EDIT = 40;
const SCORE_SUBSTRING = 20;

/** Best score for one query token against one field token. */
function scoreTokenPair(qt: string, ft: string): number {
  if (qt === ft) return SCORE_EXACT;
  if (ft.startsWith(qt) || qt.startsWith(ft)) return SCORE_PREFIX;
  if (qt.length >= 4) {
    const maxDist = maxEditDistanceForTokenLength(qt.length);
    const d = boundedLevenshtein(qt, ft, maxDist);
    if (d !== null) return SCORE_EDIT;
  }
  if (ft.includes(qt) || qt.includes(ft)) return SCORE_SUBSTRING;
  return 0;
}

/** Score one field (normalized string). Full-string exact = 1000; else token-based (fail-closed). */
function scoreField(queryNorm: string, fieldNorm: string): number {
  if (queryNorm === fieldNorm) return 1000;
  const queryTokens = tokenize(queryNorm);
  const fieldTokens = tokenize(fieldNorm);
  if (queryTokens.length === 0) return 0;
  let sum = 0;
  for (const qt of queryTokens) {
    let best = 0;
    for (const ft of fieldTokens) {
      const s = scoreTokenPair(qt, ft);
      if (s > best) best = s;
    }
    if (best === 0) return 0; // fail-closed: one token unmatched
    sum += best;
  }
  return sum;
}

const WEIGHT_NAME = 1000;
const WEIGHT_ID = 950;
const WEIGHT_ALIAS = 900;

function scoreItem(q: string, item: ExerciseCatalogItem): number {
  const qn = q;
  const nameNorm = norm(item.name);
  const idNorm = norm(item.exerciseId.replace(/_/g, " "));
  const nameSc = scoreField(qn, nameNorm);
  const idSc = scoreField(qn, idNorm);
  let aliasSc = 0;
  for (const a of item.aliases) {
    const sc = scoreField(qn, norm(a));
    if (sc > aliasSc) aliasSc = sc;
  }
  return Math.max(
    nameSc + WEIGHT_NAME,
    idSc + WEIGHT_ID,
    aliasSc + WEIGHT_ALIAS,
  );
}

/**
 * Deterministic search for exercise catalog.
 * Token-based, alias normalization, stable scoring and sort.
 * Stable sort: score DESC, then name ASC, then exerciseId ASC.
 */
export function searchExercises(
  catalog: ExerciseCatalogItem[],
  query: string,
  limit = 12,
): ExerciseCatalogItem[] {
  const q = norm(query);
  if (q === "") return [];

  const scored = catalog
    .map((item) => ({ item, score: scoreItem(q, item) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => {
      if (a.score !== b.score) return b.score - a.score;
      const an = a.item.name.localeCompare(b.item.name);
      if (an !== 0) return an;
      return a.item.exerciseId.localeCompare(b.item.exerciseId);
    })
    .map((x) => x.item);

  return scored.slice(0, Math.max(0, limit));
}
