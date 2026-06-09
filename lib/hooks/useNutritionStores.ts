import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getNutritionStores } from "@/lib/api/usersMe";
import type { NutritionStore } from "@oli/contracts/nutritionStore";

export type UseNutritionStoresResult = {
  items: readonly NutritionStore[];
  loading: boolean;
  errorMessage: string | null;
  refresh: () => Promise<void>;
};

export function useNutritionStores(): UseNutritionStoresResult {
  const { getIdToken } = useAuth();
  const [items, setItems] = useState<readonly NutritionStore[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const token = await getIdToken();
      if (!token) {
        setItems([]);
        setErrorMessage("Sign in required");
        return;
      }
      const res = await getNutritionStores(token);
      if (!res.ok) {
        setErrorMessage(res.error ?? "Could not load stores");
        return;
      }
      setItems(res.json.items);
    } catch {
      setErrorMessage("Could not load stores");
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, errorMessage, refresh };
}
