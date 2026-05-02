import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getNutritionMeta, putNutritionMeta } from "@/lib/api/usersMe";
import {
  defaultNutritionMetaDto,
  type NutritionMetaDto,
} from "@oli/contracts/nutritionMeta";
import { computeFoodHash } from "@/lib/nutrition/normalizeFoodName";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

export function upsertRecentFood(
  meta: NutritionMetaDto,
  item: Pick<NutritionFoodSearchItemDto, "id" | "name" | "brand"> & { foodHash: string; oliFoodId?: string },
): NutritionMetaDto {
  const now = new Date().toISOString();
  const without = meta.recentFoods.filter((x) => x.foodHash !== item.foodHash);
  const oliFoodId = item.oliFoodId ?? (item.id.startsWith("oli:fg:") ? item.id : undefined);
  const next = [
    {
      id: item.id,
      name: item.name,
      brand: item.brand,
      foodHash: item.foodHash,
      ...(oliFoodId !== undefined ? { oliFoodId } : {}),
      lastUsedAt: now,
    },
    ...without,
  ].slice(0, 20);
  return { ...meta, recentFoods: next };
}

export function toggleFavoriteFood(
  meta: NutritionMetaDto,
  item: Pick<NutritionFoodSearchItemDto, "id" | "name" | "brand"> & { foodHash: string; oliFoodId?: string },
): NutritionMetaDto {
  const exists = meta.favoriteFoods.some((x) => x.foodHash === item.foodHash);
  if (exists) {
    return {
      ...meta,
      favoriteFoods: meta.favoriteFoods.filter((x) => x.foodHash !== item.foodHash),
    };
  }
  const now = new Date().toISOString();
  const oliFoodId = item.oliFoodId ?? (item.id.startsWith("oli:fg:") ? item.id : undefined);
  const row = {
    id: item.id,
    name: item.name,
    brand: item.brand,
    foodHash: item.foodHash,
    ...(oliFoodId !== undefined ? { oliFoodId } : {}),
    addedAt: now,
  };
  return {
    ...meta,
    favoriteFoods: [row, ...meta.favoriteFoods.filter((x) => x.foodHash !== item.foodHash)].slice(0, 60),
  };
}

export function foodItemMetaFingerprint(food: NutritionFoodSearchItemDto): string {
  if ("foodHash" in food && typeof food.foodHash === "string" && food.foodHash.length > 0) {
    return food.foodHash;
  }
  return computeFoodHash({ name: food.name, brand: food.brand ?? null, externalFoodId: food.id });
}

export type UseNutritionMetaResult = {
  meta: NutritionMetaDto | null;
  loading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
  save: (next: NutritionMetaDto) => Promise<boolean>;
  upsertRecent: (food: NutritionFoodSearchItemDto) => Promise<boolean>;
  toggleFavorite: (food: NutritionFoodSearchItemDto) => Promise<boolean>;
};

export function useNutritionMeta(): UseNutritionMetaResult {
  const { getIdToken } = useAuth();
  const [meta, setMeta] = useState<NutritionMetaDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setErrorMessage(null);
    const token = await getIdToken(false);
    if (!token) {
      setMeta(null);
      setLoading(false);
      return;
    }
    const res = await getNutritionMeta(token);
    if (!res.ok) {
      if (res.status === 404) {
        setMeta(defaultNutritionMetaDto());
        setErrorMessage(null);
      } else {
        setErrorMessage(res.error);
        setMeta(null);
      }
    } else {
      setMeta(res.json);
    }
    setLoading(false);
  }, [getIdToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (next: NutritionMetaDto): Promise<boolean> => {
      const token = await getIdToken(false);
      if (!token) return false;
      const res = await putNutritionMeta(next, token);
      if (!res.ok) {
        setErrorMessage(res.error);
        return false;
      }
      setMeta(res.json);
      return true;
    },
    [getIdToken],
  );

  const upsertRecent = useCallback(
    async (food: NutritionFoodSearchItemDto): Promise<boolean> => {
      const base = meta ?? defaultNutritionMetaDto();
      const fh = foodItemMetaFingerprint(food);
      const next = upsertRecentFood(base, {
        id: food.id,
        name: food.name,
        brand: food.brand,
        foodHash: fh,
      });
      return save(next);
    },
    [meta, save],
  );

  const toggleFavorite = useCallback(
    async (food: NutritionFoodSearchItemDto): Promise<boolean> => {
      const base = meta ?? defaultNutritionMetaDto();
      const fh = foodItemMetaFingerprint(food);
      const next = toggleFavoriteFood(base, {
        id: food.id,
        name: food.name,
        brand: food.brand,
        foodHash: fh,
      });
      return save(next);
    },
    [meta, save],
  );

  return {
    meta,
    loading,
    errorMessage,
    refresh,
    save,
    upsertRecent,
    toggleFavorite,
  };
}
