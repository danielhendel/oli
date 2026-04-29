import { formatWorkoutTitle } from "@/lib/data/workouts/workoutDisplay";

/**
 * Apple `HKWorkoutActivityType` raw values (HealthKit). Source: Apple HealthKit enum (mirrored in
 * .NET docs). Used when ingest carries `hk.activityId` but the string name is missing or wrong
 * (e.g. react-native-health maps unknown enum cases to `"Other"`).
 *
 * @see https://learn.microsoft.com/en-us/dotnet/api/healthkit.hkworkoutactivitytype
 */
export const HK_WORKOUT_ACTIVITY_TYPE_OTHER = 3000;

/** PascalCase names match Apple's enum identifiers for {@link formatWorkoutTitle}. */
const HK_WORKOUT_ACTIVITY_ID_TO_ENUM_NAME: Record<number, string> = {
  1: "AmericanFootball",
  2: "Archery",
  3: "AustralianFootball",
  4: "Badminton",
  5: "Baseball",
  6: "Basketball",
  7: "Bowling",
  8: "Boxing",
  9: "Climbing",
  10: "Cricket",
  11: "CrossTraining",
  12: "Curling",
  13: "Cycling",
  14: "Dance",
  15: "DanceInspiredTraining",
  16: "Elliptical",
  17: "EquestrianSports",
  18: "Fencing",
  19: "Fishing",
  20: "FunctionalStrengthTraining",
  21: "Golf",
  22: "Gymnastics",
  23: "Handball",
  24: "Hiking",
  25: "Hockey",
  26: "Hunting",
  27: "Lacrosse",
  28: "MartialArts",
  29: "MindAndBody",
  30: "MixedMetabolicCardioTraining",
  31: "PaddleSports",
  32: "Play",
  33: "PreparationAndRecovery",
  34: "Racquetball",
  35: "Rowing",
  36: "Rugby",
  37: "Running",
  38: "Sailing",
  39: "SkatingSports",
  40: "SnowSports",
  41: "Soccer",
  42: "Softball",
  43: "Squash",
  44: "StairClimbing",
  45: "SurfingSports",
  46: "Swimming",
  47: "TableTennis",
  48: "Tennis",
  49: "TrackAndField",
  50: "TraditionalStrengthTraining",
  51: "Volleyball",
  52: "Walking",
  53: "WaterFitness",
  54: "WaterPolo",
  55: "WaterSports",
  56: "Wrestling",
  57: "Yoga",
  58: "Barre",
  59: "CoreTraining",
  60: "CrossCountrySkiing",
  61: "DownhillSkiing",
  62: "Flexibility",
  63: "HighIntensityIntervalTraining",
  64: "JumpRope",
  65: "Kickboxing",
  66: "Pilates",
  67: "Snowboarding",
  68: "Stairs",
  69: "StepTraining",
  70: "WheelchairWalkPace",
  71: "WheelchairRunPace",
  72: "TaiChi",
  73: "MixedCardio",
  74: "HandCycling",
  75: "DiscSports",
  76: "FitnessGaming",
  77: "CardioDance",
  78: "SocialDance",
  79: "Pickleball",
  80: "Cooldown",
  82: "SwimBikeRun",
  83: "Transition",
  84: "UnderwaterDiving",
};

/**
 * User-facing workout modality label from HealthKit activity type id, or `null` if unknown / generic.
 * Does not return a label for {@link HK_WORKOUT_ACTIVITY_TYPE_OTHER} so callers fall back to strings on the row.
 */
export function displayLabelForAppleHealthKitWorkoutActivityType(
  activityId: number | null | undefined,
): string | null {
  if (activityId == null || !Number.isFinite(activityId)) return null;
  const id = Math.trunc(activityId);
  if (id === HK_WORKOUT_ACTIVITY_TYPE_OTHER) return null;
  const pascal = HK_WORKOUT_ACTIVITY_ID_TO_ENUM_NAME[id];
  if (!pascal) return null;
  return formatWorkoutTitle(pascal);
}
