import type { ExerciseKeyframeSpec } from "../keyframe-spec/types";
import { BENCH_PRESS_KEYFRAME_POSE_SORT_ORDER } from "./types";
import type {
  ApprovedMasterImagePack,
  ImageSequencePlaybackFrame,
  ImageSequencePlaybackPlan,
  ImageSequencePlaybackPlanStatus,
} from "./types";

const DEFAULT_FRAME_DURATION_SECONDS = 4;

function resolvePlaybackStatus(imagePack: ApprovedMasterImagePack): ImageSequencePlaybackPlanStatus {
  if (imagePack.frames.length === 0) {
    return "missing";
  }

  const availableCount = imagePack.frames.filter((frame) => frame.publicPath.trim()).length;
  if (availableCount === 0) {
    return "missing";
  }

  if (imagePack.status === "approved-master" && imagePack.missingPoseIds.length === 0) {
    return "available";
  }

  return "incomplete";
}

function resolvePoseMeta(
  keyframeSpec: ExerciseKeyframeSpec | undefined,
  poseId: ImageSequencePlaybackFrame["poseId"],
): { title: string; coachingCaption: string } {
  const pose = keyframeSpec?.requiredPoses.find((row) => row.poseId === poseId);
  return {
    title: pose?.label ?? poseId,
    coachingCaption: pose?.purpose ?? `Keyframe: ${poseId}`,
  };
}

function buildFrameFromPackFrame(
  packFrame: ApprovedMasterImagePack["frames"][number],
  keyframeSpec: ExerciseKeyframeSpec | undefined,
): ImageSequencePlaybackFrame {
  const meta = resolvePoseMeta(keyframeSpec, packFrame.keyframePoseId);
  const hasPath = packFrame.publicPath.trim().length > 0;

  return {
    frameId: packFrame.frameId,
    poseId: packFrame.keyframePoseId,
    title: meta.title,
    publicPath: hasPath ? packFrame.publicPath : undefined,
    altText: packFrame.altText,
    coachingCaption: packFrame.coachingCaption || meta.coachingCaption,
    durationSeconds: DEFAULT_FRAME_DURATION_SECONDS,
    status: hasPath ? "available" : "missing",
  };
}

function buildPlaceholderFrames(
  imagePack: ApprovedMasterImagePack,
  keyframeSpec: ExerciseKeyframeSpec | undefined,
): ImageSequencePlaybackFrame[] {
  const poseOrder = keyframeSpec?.requiredPoses ?? [];

  return poseOrder.map((pose) => {
    const meta = resolvePoseMeta(keyframeSpec, pose.poseId);
    return {
      frameId: `placeholder-${pose.poseId}`,
      poseId: pose.poseId,
      title: meta.title,
      publicPath: undefined,
      altText: `Bench Press ${pose.label} keyframe — pending production`,
      coachingCaption: meta.coachingCaption,
      durationSeconds: DEFAULT_FRAME_DURATION_SECONDS,
      status: "missing" as const,
    };
  });
}

export type BuildBenchPressImageSequencePlaybackPlanInput = {
  readonly imagePack: ApprovedMasterImagePack;
  readonly keyframeSpec?: ExerciseKeyframeSpec;
};

/** Build an image sequence playback plan from an image pack. */
export function buildBenchPressImageSequencePlaybackPlan(
  input: BuildBenchPressImageSequencePlaybackPlanInput,
): ImageSequencePlaybackPlan {
  const { imagePack, keyframeSpec } = input;
  const warnings = [...imagePack.warnings];

  let frames: ImageSequencePlaybackFrame[];

  if (imagePack.frames.length > 0) {
    frames = [...imagePack.frames]
      .sort(
        (a, b) =>
          (BENCH_PRESS_KEYFRAME_POSE_SORT_ORDER[a.keyframePoseId] ?? 99) -
          (BENCH_PRESS_KEYFRAME_POSE_SORT_ORDER[b.keyframePoseId] ?? 99),
      )
      .map((frame) => buildFrameFromPackFrame(frame, keyframeSpec));
  } else {
    frames = buildPlaceholderFrames(imagePack, keyframeSpec);
    warnings.push("No approved image pack frames — showing placeholder keyframe sequence.");
  }

  const status = resolvePlaybackStatus(imagePack);

  if (status === "missing") {
    warnings.push("Image sequence playback is placeholder-only until keyframe assets are approved.");
  }

  return {
    exerciseId: imagePack.exerciseId,
    characterId: imagePack.characterId,
    imagePackId: imagePack.imagePackId,
    status,
    frames,
    warnings,
  };
}
