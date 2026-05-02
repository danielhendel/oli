import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { createDefaultFoodProvider } from "@/lib/nutrition/defaultFoodProvider";
import { dedupeFoodItemsByHash } from "@/lib/nutrition/normalizeFoodName";
import type { NutritionFoodSearchItemDto } from "@oli/contracts/nutritionFoodSearch";

export type NutritionFoodSearchQueryStatus = "idle" | "loading" | "success" | "error";

export type UseNutritionFoodSearchQueryResult = {
  query: string;
  setQuery: (q: string) => void;
  debouncedQuery: string;
  items: NutritionFoodSearchItemDto[];
  status: NutritionFoodSearchQueryStatus;
  errorMessage: string | null;
  refresh: () => void;
};

const DEBOUNCE_MS = 350;

/**
 * Debounced food search via {@link createDefaultFoodProvider} (cached Dev gateway).
 */
export function useNutritionFoodSearchQuery(): UseNutritionFoodSearchQueryResult {
  const { getIdToken } = useAuth();
  const provider = useMemo(() => createDefaultFoodProvider(getIdToken), [getIdToken]);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [items, setItems] = useState<NutritionFoodSearchItemDto[]>([]);
  const [status, setStatus] = useState<NutritionFoodSearchQueryStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async () => {
    setErrorMessage(null);
    setStatus("loading");
    try {
      const raw = await provider.searchFoods(debouncedQuery);
      setItems(dedupeFoodItemsByHash(raw));
      setStatus("success");
    } catch (e) {
      setStatus("error");
      setItems([]);
      setErrorMessage(e instanceof Error ? e.message : "Search failed");
    }
  }, [debouncedQuery, provider]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  const refresh = useCallback(() => {
    void runSearch();
  }, [runSearch]);

  return {
    query,
    setQuery,
    debouncedQuery,
    items,
    status,
    errorMessage,
    refresh,
  };
}
