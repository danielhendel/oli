/**
 * Classifies free-form workout `sport` strings (manual + Apple Health activity names)
 * for DailyFacts rollups. Backend-safe: no React / native deps.
 *
 * Rules:
 * - Strength wins when the normalized key matches a strength allowlist.
 * - Otherwise cardio when it matches a cardio allowlist.
 * - Otherwise excluded from both (unknown types are not assumed cardio — avoids mis-labeled strength).
 */

export function normalizeWorkoutSportKey(sport: string): string {
  return sport.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/** Apple / manual aliases after {@link normalizeWorkoutSportKey}. */
const STRENGTH_KEYS = new Set([
  "traditionalstrengthtraining",
  "functionalstrengthtraining",
  "coretraining",
  "strengthtraining",
  "resistancetraining",
  "weighttraining",
  "weightlifting",
  "powerlifting",
  "bodybuilding",
  "calisthenics",
]);

/** Apple / manual aliases after {@link normalizeWorkoutSportKey}. */
const CARDIO_KEYS = new Set([
  "running",
  "walking",
  "cycling",
  "handcycling",
  "swimming",
  "rowing",
  "elliptical",
  "highintensityintervaltraining",
  "hiit",
  "stairclimbing",
  "stairs",
  "steptraining",
  "hiking",
  "dance",
  "socialdance",
  "cardiodance",
  "mixedcardio",
  "mixedmetaboliccardiotraining",
  "boxing",
  "kickboxing",
  "martialarts",
  "jumprope",
  "tennis",
  "badminton",
  "squash",
  "racquetball",
  "tabletennis",
  "pickleball",
  "basketball",
  "soccer",
  "americanfootball",
  "australianfootball",
  "baseball",
  "softball",
  "volleyball",
  "lacrosse",
  "rugby",
  "fieldhockey",
  "icehockey",
  "hockey",
  "handball",
  "cricket",
  "crosscountryskiing",
  "snowboarding",
  "skiing",
  "alpineskiing",
  "skatingsports",
  "surfing",
  "surfingsports",
  "paddlingsports",
  "golf",
  "wheelchairrunpace",
  "wheelchairwalkpace",
  "climbing",
  "waterfitness",
  "waterpolo",
  "fitnessgaming",
  "discsports",
  "equestriansports",
  "fencing",
  "gymnastics",
  "trackandfield",
  "cheerleading",
  "sailing",
  "snowsports",
  "curling",
]);

export type WorkoutDailyFactsRollupClass = "cardio" | "strength" | "exclude";

/**
 * Strength is checked first so any overlapping label policy stays deterministic.
 */
export function classifyWorkoutSportForDailyFactsRollup(sport: string): WorkoutDailyFactsRollupClass {
  const key = normalizeWorkoutSportKey(sport);
  if (!key) return "exclude";
  if (STRENGTH_KEYS.has(key)) return "strength";
  if (CARDIO_KEYS.has(key)) return "cardio";
  return "exclude";
}

export function isStrengthWorkoutSport(sport: string): boolean {
  return classifyWorkoutSportForDailyFactsRollup(sport) === "strength";
}

export function isCardioWorkoutSport(sport: string): boolean {
  return classifyWorkoutSportForDailyFactsRollup(sport) === "cardio";
}
