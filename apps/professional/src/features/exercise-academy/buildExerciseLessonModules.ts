import type { ExerciseAcademyEntry, ExerciseLessonModule } from "./types";

const DEFAULT_MODULE_ORDER: {
  type: ExerciseLessonModule["type"];
  title: string;
  requiredForClient: boolean;
  mediaSlotIds: ExerciseLessonModule["mediaSlotIds"];
}[] = [
  { type: "overview", title: "Overview", requiredForClient: true, mediaSlotIds: ["hero-demo"] },
  { type: "setup", title: "Setup", requiredForClient: true, mediaSlotIds: ["setup"] },
  { type: "execution", title: "Execution", requiredForClient: true, mediaSlotIds: ["execution"] },
  {
    type: "coachNote",
    title: "Coaching Cues",
    requiredForClient: true,
    mediaSlotIds: ["execution", "close-up"],
  },
  {
    type: "commonMistakes",
    title: "Common Mistakes",
    requiredForClient: true,
    mediaSlotIds: ["common-mistake"],
  },
  {
    type: "feel",
    title: "What You Should Feel",
    requiredForClient: true,
    mediaSlotIds: ["muscle-overlay"],
  },
  {
    type: "progression",
    title: "Progression",
    requiredForClient: false,
    mediaSlotIds: [],
  },
  {
    type: "reflection",
    title: "Reflection",
    requiredForClient: false,
    mediaSlotIds: [],
  },
];

function moduleTeachingPoints(
  entry: ExerciseAcademyEntry,
  type: ExerciseLessonModule["type"],
): string[] {
  const { teaching, programming } = entry;

  switch (type) {
    case "overview":
      return [teaching.overview];
    case "setup":
      return [teaching.setup, teaching.bracing];
    case "execution":
      return [teaching.execution, teaching.tempo];
    case "coachNote":
      return teaching.coachingCues;
    case "commonMistakes":
      return teaching.commonMistakes;
    case "feel":
      return [
        ...teaching.shouldFeel.map((item) => `Should feel: ${item}`),
        ...teaching.shouldNotFeel.map((item) => `Should not feel: ${item}`),
      ];
    case "progression":
      return programming.progressionOptions;
    case "reflection":
      return [
        "Did each set stay within your target effort?",
        "Where did form break down first?",
        "What would you adjust next session?",
      ];
    default:
      return [];
  }
}

function moduleSummary(entry: ExerciseAcademyEntry, type: ExerciseLessonModule["type"]): string {
  const points = moduleTeachingPoints(entry, type);
  const first = points[0];
  if (!first) return "";
  return first.slice(0, 120) + (first.length > 120 ? "…" : "");
}

export function buildExerciseLessonModules(entry: ExerciseAcademyEntry): ExerciseLessonModule[] {
  return DEFAULT_MODULE_ORDER.map((spec, index) => ({
    moduleId: `${entry.exerciseId}-${spec.type}-${index + 1}`,
    type: spec.type,
    title: spec.title,
    summary: moduleSummary(entry, spec.type),
    teachingPoints: moduleTeachingPoints(entry, spec.type).filter(Boolean),
    mediaSlotIds: spec.mediaSlotIds,
    requiredForClient: spec.requiredForClient,
    editableByProfessional: spec.type !== "media",
  }));
}
