import { z } from "zod";

const mealMacrosSchema = z
  .object({
    caloriesKcal: z.number().finite().nonnegative(),
    proteinG: z.number().finite().nonnegative(),
    carbsG: z.number().finite().nonnegative(),
    fatG: z.number().finite().nonnegative(),
  })
  .strip();

export const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);

export type MealSlot = z.infer<typeof mealSlotSchema>;

/** Single row in a saved meal. */
export const mealItemSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    oliFoodId: z.string().min(1).optional(),
    pantryItemId: z.string().min(1).optional(),
    servings: z.number().finite().positive(),
    macrosPerServing: mealMacrosSchema,
  })
  .strip();

export type MealItem = z.infer<typeof mealItemSchema>;

/** User-owned saved meal at `users/{uid}/meals/{mealId}`. */
export const mealSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    items: z.array(mealItemSchema).min(1),
    totals: mealMacrosSchema,
    defaultMealSlot: mealSlotSchema.optional(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1),
    schemaVersion: z.literal(1),
  })
  .strip();

export type Meal = z.infer<typeof mealSchema>;

export const nutritionMealListDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    items: z.array(mealSchema),
  })
  .strip();

export type NutritionMealListDto = z.infer<typeof nutritionMealListDtoSchema>;

export const createMealRequestSchema = z
  .object({
    name: z.string().min(1),
    items: z.array(mealItemSchema).min(1),
    defaultMealSlot: mealSlotSchema.optional(),
  })
  .strip();

export type CreateMealRequest = z.infer<typeof createMealRequestSchema>;

/** Idempotent create response (mirrors createLabResultResponseDtoSchema). */
export const createMealResponseDtoSchema = z
  .object({
    ok: z.literal(true),
    id: z.string().min(1),
    idempotentReplay: z.literal(true).optional(),
  })
  .strip();

export type CreateMealResponseDto = z.infer<typeof createMealResponseDtoSchema>;
