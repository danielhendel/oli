import { z } from "zod";

const isoString = z.string().min(1);

const nutritionFoodRefBaseSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().optional(),
    foodHash: z.string().min(1),
    /** Canonical Oli Food Graph id when the user picked a graph-backed row. */
    oliFoodId: z.string().min(1).optional(),
  })
  .strip();

/** Single Firestore-backed preferences doc: `users/{uid}/nutritionMeta/state`. */
export const nutritionMetaDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    recentFoods: z.array(
      nutritionFoodRefBaseSchema.extend({
        lastUsedAt: isoString,
      }),
    ),
    favoriteFoods: z.array(
      nutritionFoodRefBaseSchema.extend({
        addedAt: isoString,
      }),
    ),
  })
  .strip();

export type NutritionMetaDto = z.infer<typeof nutritionMetaDtoSchema>;

export function defaultNutritionMetaDto(): NutritionMetaDto {
  return {
    schemaVersion: 1,
    recentFoods: [],
    favoriteFoods: [],
  };
}
