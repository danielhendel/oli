import { buildBenchPressKeyframeSpec } from "../exercise-media-os/keyframe-spec/buildBenchPressKeyframeSpec";
import { buildApprovedMasterImagePack } from "../exercise-media-os/image-pack/buildApprovedMasterImagePack";
import { buildBenchPressImagePack } from "../exercise-media-os/image-pack/buildBenchPressImagePack";
import { listBenchPressKeyframeImportManifestEntries } from "../exercise-media-os/candidate-production/data/benchPressKeyframeImportManifest.v1";
import type { ExerciseMediaCandidate } from "../exercise-media-os/candidate-review/types";

export type ExerciseThumbnailKind =
  | "approved-master-image"
  | "dev-test-candidate-image"
  | "imported-keyframe-candidate"
  | "media-placeholder"
  | "muscle-equipment-placeholder";

export type ExerciseThumbnailSource = {
  readonly kind: ExerciseThumbnailKind;
  readonly src?: string;
  readonly alt: string;
  readonly label: string;
  readonly isRenderableImage: boolean;
  readonly exerciseId: string;
};

export type ResolveExerciseThumbnailInput = {
  readonly exerciseId: string;
  readonly exerciseName: string;
  readonly primaryMuscle?: string;
  readonly equipment?: string;
  /** Test seam — override repo file presence without disk reads */
  readonly filePresenceOverrides?: Readonly<Record<string, boolean>>;
  /** Test seam — inject approved-master candidates */
  readonly approvedMasterCandidatesOverride?: readonly ExerciseMediaCandidate[];
};

function buildAltText(exerciseName: string, exerciseId: string): string {
  const name = exerciseName.trim() || exerciseId;
  return `${name} exercise thumbnail`;
}

function muscleEquipmentPlaceholder(input: ResolveExerciseThumbnailInput): ExerciseThumbnailSource {
  const muscle = input.primaryMuscle?.trim() || "Exercise";
  const equipment = input.equipment?.trim();
  const label = equipment ? `${muscle} · ${equipment}` : muscle;

  return {
    kind: "muscle-equipment-placeholder",
    alt: buildAltText(input.exerciseName, input.exerciseId),
    label,
    isRenderableImage: false,
    exerciseId: input.exerciseId,
  };
}

function mediaPlaceholder(input: ResolveExerciseThumbnailInput): ExerciseThumbnailSource {
  return {
    kind: "media-placeholder",
    alt: buildAltText(input.exerciseName, input.exerciseId),
    label: "Image pending",
    isRenderableImage: false,
    exerciseId: input.exerciseId,
  };
}

function resolveFileExists(
  publicPath: string,
  overrides?: Readonly<Record<string, boolean>>,
): boolean {
  if (overrides && publicPath in overrides) {
    return overrides[publicPath] === true;
  }
  return false;
}

function resolveApprovedMasterThumbnail(
  input: ResolveExerciseThumbnailInput,
): ExerciseThumbnailSource | null {
  if (input.exerciseId !== "bench_press") {
    return null;
  }

  if (input.approvedMasterCandidatesOverride && input.approvedMasterCandidatesOverride.length > 0) {
    const keyframeSpec = buildBenchPressKeyframeSpec();
    const pack = buildApprovedMasterImagePack({
      imagePackId: "thumbnail-resolver-fixture-pack",
      exerciseId: keyframeSpec.exerciseId,
      packageVersion: "thumbnail-resolver-fixture-v1",
      keyframeSpec: {
        exerciseId: keyframeSpec.exerciseId,
        keyframeSetId: keyframeSpec.keyframeSetId,
        keyframeVersion: keyframeSpec.keyframeVersion,
        characterId: keyframeSpec.characterId,
        requiredPoses: keyframeSpec.requiredPoses.map((pose) => ({
          poseId: pose.poseId,
          label: pose.label,
          purpose: pose.purpose,
        })),
      },
      candidates: input.approvedMasterCandidatesOverride,
      requiredRenderTargets: ["16:9"],
      createdAt: "2026-06-30T00:00:00.000Z",
      updatedAt: "2026-06-30T00:00:00.000Z",
      requireFilesInRepo: true,
    });

    const frame = pack.frames.find((item) => item.publicPath.trim().length > 0);
    if (!frame) return null;

    return {
      kind: "approved-master-image",
      src: frame.publicPath,
      alt: frame.altText || buildAltText(input.exerciseName, input.exerciseId),
      label: "Approved master",
      isRenderableImage: true,
      exerciseId: input.exerciseId,
    };
  }

  const livePack = buildBenchPressImagePack();
  const liveFrame = livePack.frames.find((frame) => frame.publicPath.trim().length > 0);
  if (!liveFrame) {
    return null;
  }

  const pathExists = resolveFileExists(liveFrame.publicPath, input.filePresenceOverrides);
  if (!pathExists && input.filePresenceOverrides) {
    return null;
  }

  if (!pathExists) {
    return null;
  }

  return {
    kind: "approved-master-image",
    src: liveFrame.publicPath,
    alt: liveFrame.altText || buildAltText(input.exerciseName, input.exerciseId),
    label: "Approved master",
    isRenderableImage: true,
    exerciseId: input.exerciseId,
  };
}

function resolveImportedKeyframeThumbnail(
  input: ResolveExerciseThumbnailInput,
): ExerciseThumbnailSource | null {
  if (input.exerciseId !== "bench_press") {
    return null;
  }

  const entry = listBenchPressKeyframeImportManifestEntries().find((item) => {
    const exists = input.filePresenceOverrides
      ? resolveFileExists(item.expectedPublicPath, input.filePresenceOverrides)
      : item.fileExists;
    return exists;
  });

  if (!entry) {
    return null;
  }

  return {
    kind: "imported-keyframe-candidate",
    src: entry.expectedPublicPath,
    alt: buildAltText(input.exerciseName, input.exerciseId),
    label: "Dev preview",
    isRenderableImage: true,
    exerciseId: input.exerciseId,
  };
}

/**
 * Resolve the best available exercise thumbnail without exposing media factory UI.
 * Never fabricates approved media — missing files return placeholders.
 */
export function resolveExerciseThumbnail(
  input: ResolveExerciseThumbnailInput,
): ExerciseThumbnailSource {
  const approved = resolveApprovedMasterThumbnail(input);
  if (approved) {
    return approved;
  }

  const imported = resolveImportedKeyframeThumbnail(input);
  if (imported) {
    return imported;
  }

  if (input.primaryMuscle?.trim() || input.equipment?.trim()) {
    return muscleEquipmentPlaceholder(input);
  }

  return mediaPlaceholder(input);
}
