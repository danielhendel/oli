import { listCanonicalWorkoutLibraryExercises } from "../workout-studio/exerciseLibraryAdapter";
import { buildExerciseMediaBlueprint } from "./buildExerciseMediaBlueprint";
import { buildClientMediaTimeline } from "./buildClientMediaTimeline";
import { buildMediaReadinessScore } from "./buildMediaReadinessScore";
import {
  buildDefaultMediaComposerState,
  mergeMediaComposerState,
  type MediaComposerOverrides,
} from "./buildMediaComposerState";
import { resolveMasterMediaPackage } from "./buildMasterMediaPackage";
import type {
  ClientMediaTimeline,
  ExerciseMediaBlueprint,
  MasterMediaPackage,
  MediaComposerState,
  MediaReadinessScore,
} from "./types";

type ExerciseMediaLookup = {
  exerciseId: string;
  exerciseName: string;
};

function resolveExerciseLookup(exerciseId: string): ExerciseMediaLookup | null {
  const library = listCanonicalWorkoutLibraryExercises();
  const match = library.find((exercise) => exercise.exerciseId === exerciseId);
  if (!match) return null;
  return { exerciseId: match.exerciseId, exerciseName: match.name };
}

function resolveExerciseLookupOrFallback(
  exerciseId: string,
  exerciseName?: string,
): ExerciseMediaLookup {
  const resolved = resolveExerciseLookup(exerciseId);
  if (resolved) return resolved;
  return {
    exerciseId,
    exerciseName: exerciseName ?? exerciseId,
  };
}

export function getExerciseMediaBlueprintById(
  exerciseId: string,
  exerciseName?: string,
): ExerciseMediaBlueprint | null {
  const lookup = resolveExerciseLookup(exerciseId);
  if (!lookup && !exerciseName) return null;
  const input = lookup ?? { exerciseId, exerciseName: exerciseName ?? exerciseId };
  return buildExerciseMediaBlueprint(input);
}

export function getMasterMediaPackageById(
  exerciseId: string,
  exerciseName?: string,
): MasterMediaPackage | null {
  const blueprint = getExerciseMediaBlueprintById(exerciseId, exerciseName);
  if (!blueprint) return null;
  return resolveMasterMediaPackage(blueprint);
}

export function getPlannedMasterMediaPackageById(
  exerciseId: string,
  exerciseName?: string,
): MasterMediaPackage | null {
  return getMasterMediaPackageById(exerciseId, exerciseName);
}

export function getDefaultMediaComposerStateById(exerciseId: string): MediaComposerState {
  return buildDefaultMediaComposerState(exerciseId);
}

export function getClientMediaTimelineById(
  exerciseId: string,
  composerOverrides?: MediaComposerOverrides,
  exerciseName?: string,
): ClientMediaTimeline | null {
  const mediaPackage = getMasterMediaPackageById(exerciseId, exerciseName);
  if (!mediaPackage) return null;
  const composer = mergeMediaComposerState(exerciseId, composerOverrides);
  return buildClientMediaTimeline(mediaPackage, composer);
}

export function getExerciseMediaReadinessById(
  exerciseId: string,
  exerciseName?: string,
): MediaReadinessScore | null {
  const mediaPackage = getMasterMediaPackageById(exerciseId, exerciseName);
  if (!mediaPackage) return null;
  return buildMediaReadinessScore(mediaPackage);
}

export function resolveMediaComposerForExercise(input: {
  exerciseId: string | null;
  exerciseName: string;
  mediaComposer?: MediaComposerState;
}): MediaComposerState {
  const id = input.exerciseId ?? `custom-${input.exerciseName.toLowerCase().replace(/\s+/g, "-")}`;
  if (input.mediaComposer) return input.mediaComposer;
  return buildDefaultMediaComposerState(id);
}

export function getExerciseMediaOsBundle(input: {
  exerciseId: string | null;
  exerciseName: string;
  mediaComposer?: MediaComposerState;
}): {
  blueprint: ExerciseMediaBlueprint;
  mediaPackage: MasterMediaPackage;
  composer: MediaComposerState;
  timeline: ClientMediaTimeline;
  readiness: MediaReadinessScore;
} {
  const id = input.exerciseId ?? `custom-${input.exerciseName.toLowerCase().replace(/\s+/g, "-")}`;
  const lookup = resolveExerciseLookupOrFallback(id, input.exerciseName);
  const blueprint = buildExerciseMediaBlueprint(lookup);
  const mediaPackage = resolveMasterMediaPackage(blueprint);
  const composer = input.mediaComposer
    ? { ...input.mediaComposer, exerciseId: id }
    : buildDefaultMediaComposerState(id);
  const timeline = buildClientMediaTimeline(mediaPackage, composer);
  const readiness = buildMediaReadinessScore(mediaPackage);

  return { blueprint, mediaPackage, composer, timeline, readiness };
}
