/**
 * Resolves which block should receive an exercise added from the workout log
 * when the user uses the bottom "+ Exercise" action or when the picker returns
 * without an explicit `blockId` param.
 */
export function resolveAddExerciseTargetBlockId(
  orderedDisplayBlockIds: string[],
  selectedBlockId: string | null,
): string | undefined {
  if (orderedDisplayBlockIds.length === 0) return undefined;
  if (selectedBlockId != null && orderedDisplayBlockIds.includes(selectedBlockId)) {
    return selectedBlockId;
  }
  return orderedDisplayBlockIds[orderedDisplayBlockIds.length - 1];
}
