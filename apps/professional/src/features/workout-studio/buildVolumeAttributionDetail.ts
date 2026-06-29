import type {
  JointStressAttribution,
  WorkoutVolumeAttribution,
} from "./buildWorkoutVolumeAttribution";

export type VolumeAttributionDetail = {
  title: string;
  totalLabel: string;
  totalValue: string;
  whyItMatters: string;
  contributors: {
    exerciseName: string;
    blockTitle: string;
    sets: number;
    note?: string;
  }[];
};

export function buildPrimaryVolumeDetail(
  attribution: WorkoutVolumeAttribution,
  muscleGroup: string,
): VolumeAttributionDetail | null {
  const row = attribution.primary.find((item) => item.muscleGroup === muscleGroup);
  if (!row) return null;

  return {
    title: `${row.muscleGroup} — Primary Volume`,
    totalLabel: "Primary contribution",
    totalValue: `${row.sets} set${row.sets === 1 ? "" : "s"}`,
    whyItMatters:
      "Primary muscles receive full designed-set credit when Academy Intelligence is available, or fallback primary taxonomy when not.",
    contributors: row.contributors.map((item) => ({
      exerciseName: item.exerciseName,
      blockTitle: item.blockTitle,
      sets: item.sets,
    })),
  };
}

export function buildSecondaryVolumeDetail(
  attribution: WorkoutVolumeAttribution,
  muscleGroup: string,
): VolumeAttributionDetail | null {
  const row = attribution.secondary.find((item) => item.muscleGroup === muscleGroup);
  if (!row) return null;

  return {
    title: `${row.muscleGroup} — Secondary Volume`,
    totalLabel: "Secondary contribution",
    totalValue: `${row.sets} set${row.sets === 1 ? "" : "s"}`,
    whyItMatters:
      "Secondary muscles receive designed-set credit from Academy Intelligence only — useful for fatigue and balance planning.",
    contributors: row.contributors.map((item) => ({
      exerciseName: item.exerciseName,
      blockTitle: item.blockTitle,
      sets: item.sets,
    })),
  };
}

export function buildStabilizerDetail(
  attribution: WorkoutVolumeAttribution,
  stabilizer: string,
): VolumeAttributionDetail | null {
  const row = attribution.stabilizers.find((item) => item.stabilizer === stabilizer);
  if (!row) return null;

  return {
    title: `${row.stabilizer} — Stabilizer Demand`,
    totalLabel: "Exercise exposure",
    totalValue: `${row.exposureCount} exercise${row.exposureCount === 1 ? "" : "s"}`,
    whyItMatters:
      "Stabilizer demand tracks qualitative exposure across the workout — not logged execution volume.",
    contributors: row.contributors.map((item) => ({
      exerciseName: item.exerciseName,
      blockTitle: item.blockTitle,
      sets: item.sets,
    })),
  };
}

export function buildJointStressDetail(
  attribution: WorkoutVolumeAttribution,
  joint: JointStressAttribution["joint"],
  stressLevel: JointStressAttribution["stressLevel"],
): VolumeAttributionDetail | null {
  const row = attribution.jointStress.find(
    (item) => item.joint === joint && item.stressLevel === stressLevel,
  );
  if (!row) return null;

  const jointLabel = joint.charAt(0).toUpperCase() + joint.slice(1);

  return {
    title: `${jointLabel} — ${stressLevel} joint consideration`,
    totalLabel: "Exercise exposure",
    totalValue: `${row.exposureCount} exercise${row.exposureCount === 1 ? "" : "s"}`,
    whyItMatters:
      "Joint considerations are coaching guidance for exercise selection — not medical diagnosis.",
    contributors: row.contributors.map((item) => ({
      exerciseName: item.exerciseName,
      blockTitle: item.blockTitle,
      sets: item.sets,
      note: item.note,
    })),
  };
}

export function countFlaggedJoints(attribution: WorkoutVolumeAttribution): number {
  const joints = new Set(attribution.jointStress.map((row) => row.joint));
  return joints.size;
}
