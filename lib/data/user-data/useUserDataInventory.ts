/**
 * Client inventory hook (Phase 3B).
 *
 * Architecture note: no new inventory API endpoint in v1.
 * Existing authenticated routes already expose connection status and lab upload lists.
 * This hook merges those metadata signals with pure registries/graph builders.
 * It never returns raw health values, tokens, provider IDs, or collection names.
 */

import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/lib/auth/AuthProvider";
import { getLabUploads } from "@/lib/api/labs";
import { useOuraPresence } from "@/lib/data/useOuraPresence";
import { getAppleHealthConnected } from "@/lib/integrations/appleHealth/storage";
import {
  buildUserDataInventoryViewModel,
  type UserDataInventoryViewModel,
} from "./buildUserDataInventoryViewModel";

export type UserDataInventoryLoadState = "loading" | "ready" | "error" | "partial";

export type UserDataInventoryHookResult = {
  state: UserDataInventoryLoadState;
  inventory: UserDataInventoryViewModel | null;
  error: string | null;
  refresh: () => void;
};

export function useUserDataInventory(): UserDataInventoryHookResult {
  const { user, getIdToken } = useAuth();
  const oura = useOuraPresence();
  const [appleHealthConnected, setAppleHealthConnected] = useState<boolean | null>(null);
  const [labUploadCountCategory, setLabUploadCountCategory] = useState<"none" | "some" | "unknown">(
    "unknown",
  );
  const [labsError, setLabsError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const ouraConnected = oura.status === "ready" ? oura.data.connected : null;
  const ouraLastSyncKnown =
    oura.status === "ready" ? Boolean(oura.data.lastSyncAt) : false;
  const ouraError = oura.status === "error" ? oura.error : null;

  useEffect(() => {
    let cancelled = false;
    void getAppleHealthConnected().then((connected) => {
      if (!cancelled) setAppleHealthConnected(connected);
    });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadLabs() {
      if (!user) {
        setLabUploadCountCategory("none");
        return;
      }
      try {
        const token = await getIdToken(true);
        if (!token || cancelled) return;
        const res = await getLabUploads(token);
        if (cancelled) return;
        if (!res.ok) {
          setLabsError(true);
          setLabUploadCountCategory("unknown");
          return;
        }
        setLabsError(false);
        setLabUploadCountCategory(res.json.items.length > 0 ? "some" : "none");
      } catch {
        if (!cancelled) {
          setLabsError(true);
          setLabUploadCountCategory("unknown");
        }
      }
    }
    void loadLabs();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken, refreshKey]);

  const inventory = useMemo(() => {
    return buildUserDataInventoryViewModel({
      authPresent: Boolean(user),
      dateOfBirthPresent: false,
      sexAtBirthPresent: false,
      heightPresent: false,
      preferredUnitsPresent: true,
      timezonePresent: true,
      ouraConnected,
      appleHealthConnected,
      ouraLastSyncKnown,
      labUploadCountCategory,
      labsStructuredExtractionAvailable: false,
      withingsFirestoreConnectedFlag: null,
      withingsHasHistoricalRawEvents: null,
    });
  }, [
    user,
    ouraConnected,
    appleHealthConnected,
    ouraLastSyncKnown,
    labUploadCountCategory,
  ]);

  const state: UserDataInventoryLoadState = (() => {
    if (!user) return "ready";
    if (appleHealthConnected == null && labUploadCountCategory === "unknown") return "loading";
    if (labsError || ouraError) return "partial";
    return "ready";
  })();

  return {
    state,
    inventory,
    error: labsError ? "Some record counts could not be loaded." : ouraError,
    refresh: () => setRefreshKey((k) => k + 1),
  };
}
