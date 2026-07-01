import type { ExerciseMediaCandidate } from "./types";
import type { BenchPressKeyframePoseId } from "../keyframe-spec/types";
import {
  buildCandidateImageQaWorksheet,
  type CandidateImageQaWorksheet,
  type CandidateImageQaWorksheetItem,
} from "./buildCandidateImageQaWorksheet";

function poseItem(
  poseId: string,
  itemId: string,
  label: string,
  description: string,
): CandidateImageQaWorksheetItem {
  return {
    itemId: `bench-press-${poseId}-${itemId}`,
    category: "pose",
    label,
    description,
    severity: "major",
    blocksMasterApproval: true,
    defaultStatus: "not-reviewed",
  };
}

const GLOBAL_BENCH_PRESS_ITEMS: CandidateImageQaWorksheetItem[] = [
  {
    itemId: "bench-press-full-bench",
    category: "equipment",
    label: "Full bench visible",
    description: "Full bench pad visible in 16:9 master view.",
    severity: "major",
    blocksMasterApproval: true,
    defaultStatus: "not-reviewed",
  },
  {
    itemId: "bench-press-barbell-visible",
    category: "equipment",
    label: "Barbell visible",
    description: "Barbell and plates visible with realistic geometry.",
    severity: "critical",
    blocksMasterApproval: true,
    defaultStatus: "not-reviewed",
  },
  {
    itemId: "bench-press-feet-visible",
    category: "pose",
    label: "Feet visible in 16:9",
    description: "Feet planted and visible in master 16:9 frame.",
    severity: "major",
    blocksMasterApproval: true,
    defaultStatus: "not-reviewed",
  },
  {
    itemId: "bench-press-no-spotter",
    category: "brand",
    label: "No spotter",
    description: "No spotter in frame.",
    severity: "minor",
    blocksMasterApproval: false,
    defaultStatus: "not-reviewed",
  },
  {
    itemId: "bench-press-no-distorted-hands",
    category: "technical-quality",
    label: "No distorted hands",
    description: "Hands and wrists are anatomically plausible.",
    severity: "critical",
    blocksMasterApproval: true,
    defaultStatus: "not-reviewed",
  },
  {
    itemId: "bench-press-no-warped-barbell",
    category: "equipment",
    label: "No warped barbell",
    description: "Barbell remains straight with symmetric plates.",
    severity: "critical",
    blocksMasterApproval: true,
    defaultStatus: "not-reviewed",
  },
];

const POSE_SPECIFIC_ITEMS: Record<BenchPressKeyframePoseId, readonly CandidateImageQaWorksheetItem[]> = {
  setup: [
    poseItem("setup", "lying-on-bench", "Athlete lying on bench", "Athlete lying on flat bench."),
    poseItem("setup", "eyes-under-bar", "Eyes under bar", "Eyes under bar or slightly behind bar."),
    poseItem("setup", "even-grip", "Even grip", "Hands set evenly on bar."),
    poseItem("setup", "feet-planted", "Feet planted", "Feet planted on floor."),
    poseItem("setup", "upper-back-tight", "Upper back tight", "Upper back tight with scapulae retracted."),
    poseItem("setup", "glutes-on-bench", "Glutes on bench", "Glutes remain on bench pad."),
  ],
  start_lockout: [
    poseItem("start_lockout", "bar-above-chest", "Bar above chest line", "Bar above chest/shoulder line at lockout."),
    poseItem("start_lockout", "elbows-locked", "Elbows locked", "Elbows locked or nearly locked."),
    poseItem("start_lockout", "wrists-stacked", "Wrists stacked", "Wrists stacked over elbows."),
    poseItem("start_lockout", "scapulae-set", "Scapulae set", "Shoulder blades retracted and depressed."),
    poseItem("start_lockout", "stable-torso", "Stable torso", "Torso stable on bench."),
  ],
  bottom_chest_pause: [
    poseItem("bottom_chest_pause", "chest-touch", "Chest/sternum touch", "Bar touches lower chest/sternum line."),
    poseItem("bottom_chest_pause", "paused-position", "Paused position", "Clear paused bottom position."),
    poseItem("bottom_chest_pause", "wrists-stacked-bottom", "Wrists stacked at bottom", "Wrists stacked at bottom."),
    poseItem("bottom_chest_pause", "moderate-elbows", "Moderate elbows", "Elbows at moderate angle."),
    poseItem("bottom_chest_pause", "no-bounce", "No bounce", "No bounce implied at chest."),
    poseItem(
      "bottom_chest_pause",
      "bar-not-hovering",
      "Bar not hovering",
      "Bar is not hovering above chest.",
    ),
  ],
  finish_lockout: [
    poseItem("finish_lockout", "returned-lockout", "Returned to lockout", "Bar returned to lockout finish."),
    poseItem("finish_lockout", "no-second-descent", "No second descent", "No second descent implied."),
    poseItem("finish_lockout", "stable-bar", "Stable bar", "Bar stable at finish."),
    poseItem("finish_lockout", "controlled-finish", "Controlled finish", "Controlled confident finish."),
    poseItem(
      "finish_lockout",
      "continuity",
      "Character/equipment continuity",
      "Same camera, character, and equipment continuity.",
    ),
  ],
};

/** Build Bench Press keyframe-specific human QA worksheet for an imported image candidate. */
export function buildBenchPressKeyframeCandidateQaWorksheet(
  candidate: ExerciseMediaCandidate,
): CandidateImageQaWorksheet {
  const base = buildCandidateImageQaWorksheet({
    exerciseId: candidate.exerciseId,
    candidateId: candidate.candidateId,
    keyframePoseId: candidate.keyframePoseId,
    renderTarget: candidate.renderTarget,
  });

  const poseId = candidate.keyframePoseId as BenchPressKeyframePoseId | undefined;
  const poseItems = poseId ? (POSE_SPECIFIC_ITEMS[poseId] ?? []) : [];

  const items = [...base.items, ...GLOBAL_BENCH_PRESS_ITEMS, ...poseItems];
  const hardGateItemIds = items
    .filter((worksheetItem) => worksheetItem.blocksMasterApproval)
    .map((worksheetItem) => worksheetItem.itemId);

  return {
    ...base,
    worksheetId: `bench-press-keyframe-qa-worksheet-v1-${candidate.candidateId}`,
    items,
    hardGateItemIds,
    warnings: [
      ...base.warnings,
      "Bench Press master approval is out of scope for M15.",
      "Human visual QA of imported PNG is required.",
    ],
  };
}
