/**
 * Purpose: Encapsulate workout CRUD with loading/error for screens.
 * Side-effects: Firestore reads/writes via DAL.
 */
import { useCallback, useEffect, useState } from "react";
import { addWorkoutLog, listRecentWorkouts, updateWorkoutLog } from "../lib/db/workouts";
import { WorkoutLog } from "../lib/types/workout";
import { getAuth } from "firebase/auth";

export function useWorkoutLogs() {
  const uid = getAuth().currentUser?.uid ?? null;
  const [items, setItems] = useState<WorkoutLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const rows = await listRecentWorkouts(uid, 50);
      setItems(rows);
      setError(null);
    } catch {
      setError("Failed to load workouts");
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const add = useCallback(
    async (draft: Omit<WorkoutLog, "id" | "createdAt" | "updatedAt">) => {
      if (!uid) throw new Error("Not signed in");
      const created = await addWorkoutLog(uid, draft);
      setItems((cur) => [created, ...cur]);
      return created;
    },
    [uid]
  );

  const update = useCallback(
    async (logId: string, partial: Partial<WorkoutLog>) => {
      if (!uid) throw new Error("Not signed in");
      await updateWorkoutLog(uid, logId, partial);
      setItems((cur) => cur.map((w) => (w.id === logId ? { ...w, ...partial } : w)));
    },
    [uid]
  );

  return { items, loading, error, refresh, add, update, uid };
}
