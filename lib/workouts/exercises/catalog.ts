export type ExerciseCatalogItem = {
  exerciseId: string;
  name: string;
  aliases: string[];
};

import { EXERCISE_LIBRARY_V1 } from "./library.v1";

export const EXERCISE_CATALOG_V1: ExerciseCatalogItem[] = EXERCISE_LIBRARY_V1.map(
  (x) => ({
    exerciseId: x.exerciseId,
    name: x.name,
    aliases: x.aliases,
  })
);
