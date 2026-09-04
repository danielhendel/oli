/**
 * Account deletion hook (Stage 1C).
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createDeletionRequestId,
  getAccountDeletionStatus,
  getLatestAccountDeletion,
  requestAccountDeletion,
} from "@/lib/api/accountDeletion";
import {
  clearAccountDeletionRecoveryMarker,
  clearUserScopedLocalData,
  resumeAccountDeletionLocalCleanup,
  setAccountDeletionRecoveryMarker,
} from "@/lib/auth/accountLifecycleCleanup";
import { reauthenticateForAccountDeletion } from "@/lib/auth/reauthenticateForDeletion";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ConsumerDeleteStatus, DeleteStatusResponseDto } from "@/lib/contracts";
import { mapDeleteApiFailure, mapLocalCleanupFailure } from "@/lib/data/user-data/accountDeletion/mapDeleteError";

export type AccountDeletionViewState = {
  status: ConsumerDeleteStatus;
  requestId: string | null;
  requestedAt: string | null;
  retryable: boolean;
  failureCategory: DeleteStatusResponseDto["failureCategory"];
};

export type AccountDeletionHookResult = {
  deletionState: AccountDeletionViewState;
  loading: boolean;
  submitting: boolean;
  reauthing: boolean;
  error: string | null;
  errorRetryable: boolean;
  deletionAccepted: boolean;
  refresh: () => void;
  reauthenticate: (password: string) => Promise<boolean>;
  submitDeletion: () => Promise<boolean>;
  retryLocalCleanup: () => Promise<void>;
};

const IDLE_STATE: AccountDeletionViewState = {
  status: "idle",
  requestId: null,
  requestedAt: null,
  retryable: true,
  failureCategory: "none",
};

function toViewState(dto: DeleteStatusResponseDto): AccountDeletionViewState {
  return {
    status: dto.status,
    requestId: dto.requestId,
    requestedAt: dto.requestedAt,
    retryable: dto.retryable,
    failureCategory: dto.failureCategory ?? "none",
  };
}

export function useAccountDeletion(): AccountDeletionHookResult {
  const { user, getIdToken, signOutUser } = useAuth();
  const [deletionState, setDeletionState] = useState<AccountDeletionViewState>(IDLE_STATE);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reauthing, setReauthing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [reauthOk, setReauthOk] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const submitGuardRef = useRef(false);
  const userUidRef = useRef<string | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const clearError = useCallback(() => {
    setError(null);
    setErrorRetryable(false);
  }, []);

  const deletionAccepted =
    deletionState.status === "accepted" ||
    deletionState.status === "queued" ||
    deletionState.status === "processing" ||
    deletionState.status === "cleanup_required" ||
    deletionState.status === "locally_completed";

  useEffect(() => {
    const uid = user?.uid ?? null;
    if (userUidRef.current !== uid) {
      userUidRef.current = uid;
      setDeletionState(IDLE_STATE);
      setReauthOk(false);
      clearError();
    }
  }, [user?.uid, clearError]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setDeletionState(IDLE_STATE);
        setLoading(false);
        return;
      }

      setLoading(true);
      clearError();

      try {
        const token = await getIdToken(false);
        if (!token || cancelled) return;

        const res = await getLatestAccountDeletion(token);
        if (cancelled) return;

        if (!res.ok) {
          const mapped = mapDeleteApiFailure(res);
          setError(mapped.message);
          setErrorRetryable(mapped.retryable);
          return;
        }

        if (!res.json.deletion) {
          setDeletionState(IDLE_STATE);
          return;
        }

        setDeletionState(toViewState({ ok: true, ...res.json.deletion }));
      } catch {
        if (!cancelled) {
          setError("No connection. Check your network and try again.");
          setErrorRetryable(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [user, getIdToken, refreshKey, clearError]);

  const runPostAcceptanceCleanup = useCallback(async (): Promise<boolean> => {
    const uid = user?.uid ?? null;
    await setAccountDeletionRecoveryMarker({ phase: "cleanup_required" });
    try {
      await clearUserScopedLocalData({ previousUserId: uid, reason: "account_deletion" });
      await clearAccountDeletionRecoveryMarker();
      await signOutUser();
      setDeletionState((prev) => ({ ...prev, status: "locally_completed" }));
      return true;
    } catch {
      setDeletionState((prev) => ({ ...prev, status: "cleanup_required" }));
      const mapped = mapLocalCleanupFailure();
      setError(mapped.message);
      setErrorRetryable(mapped.retryable);
      return false;
    }
  }, [signOutUser, user?.uid]);

  const reauthenticate = useCallback(async (password: string): Promise<boolean> => {
    setReauthing(true);
    clearError();
    try {
      const result = await reauthenticateForAccountDeletion(password);
      if (!result.ok) {
        setError(result.message);
        setErrorRetryable(result.kind === "network" || result.kind === "too_many_requests");
        setReauthOk(false);
        return false;
      }
      setReauthOk(true);
      return true;
    } finally {
      setReauthing(false);
    }
  }, [clearError]);

  const submitDeletion = useCallback(async (): Promise<boolean> => {
    if (!user || submitGuardRef.current || !reauthOk) return false;
    if (deletionAccepted) return true;

    submitGuardRef.current = true;
    setSubmitting(true);
    clearError();

    const clientRequestId = createDeletionRequestId();

    try {
      const token = await getIdToken(true);
      if (!token) {
        setError("Your session expired. Sign in again and retry.");
        setErrorRetryable(false);
        return false;
      }

      setDeletionState((prev) => ({
        ...prev,
        status: "requesting",
        requestId: clientRequestId,
      }));

      const res = await requestAccountDeletion(token, { clientRequestId });
      if (!res.ok) {
        const mapped = mapDeleteApiFailure(res);
        setError(mapped.message);
        setErrorRetryable(mapped.retryable);
        setDeletionState(IDLE_STATE);
        setReauthOk(false);
        return false;
      }

      const statusRes = await getAccountDeletionStatus(token, res.json.requestId);
      if (!statusRes.ok) {
        const mapped = mapDeleteApiFailure(statusRes);
        setError(mapped.message);
        setErrorRetryable(mapped.retryable);
        return false;
      }

      setDeletionState(toViewState(statusRes.json));
      await runPostAcceptanceCleanup();
      return true;
    } catch {
      setError("No connection. Check your network and try again.");
      setErrorRetryable(true);
      setDeletionState(IDLE_STATE);
      setReauthOk(false);
      return false;
    } finally {
      setSubmitting(false);
      submitGuardRef.current = false;
    }
  }, [
    user,
    reauthOk,
    deletionAccepted,
    getIdToken,
    clearError,
    runPostAcceptanceCleanup,
  ]);

  const retryLocalCleanup = useCallback(async () => {
    clearError();
    const uid = user?.uid ?? null;
    try {
      await resumeAccountDeletionLocalCleanup(uid);
      await signOutUser();
      setDeletionState((prev) => ({ ...prev, status: "locally_completed" }));
    } catch {
      const mapped = mapLocalCleanupFailure();
      setError(mapped.message);
      setErrorRetryable(mapped.retryable);
    }
  }, [user?.uid, signOutUser, clearError]);

  return {
    deletionState,
    loading,
    submitting,
    reauthing,
    error,
    errorRetryable,
    deletionAccepted,
    refresh,
    reauthenticate,
    submitDeletion,
    retryLocalCleanup,
  };
}
