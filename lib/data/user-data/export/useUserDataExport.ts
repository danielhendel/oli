/**
 * User data export hook (Stage 1B).
 * Server is source of truth; keyed by current user identity.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import {
  getLatestUserDataExport,
  getUserDataExportDownload,
  getUserDataExportStatus,
  requestUserDataExport,
} from "@/lib/api/accountExport";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { ConsumerExportStatus, ExportStatusResponseDto } from "@/lib/contracts";
import { downloadAndShareUserDataExport } from "@/lib/data/user-data/export/downloadUserDataExport";
import { mapExportApiFailure } from "@/lib/data/user-data/export/mapExportError";

export type UserDataExportViewState = {
  status: ConsumerExportStatus;
  requestId: string | null;
  requestedAt: string | null;
  completedAt: string | null;
  expiresAt: string | null;
  retryable: boolean;
  packageAvailable: boolean;
};

export type UserDataExportHookResult = {
  exportState: UserDataExportViewState;
  loading: boolean;
  requesting: boolean;
  downloading: boolean;
  error: string | null;
  errorRetryable: boolean;
  refresh: () => void;
  requestExport: () => Promise<void>;
  downloadExport: () => Promise<void>;
};

const IDLE_STATE: UserDataExportViewState = {
  status: "idle",
  requestId: null,
  requestedAt: null,
  completedAt: null,
  expiresAt: null,
  retryable: true,
  packageAvailable: false,
};

function toViewState(dto: ExportStatusResponseDto): UserDataExportViewState {
  return {
    status: dto.status,
    requestId: dto.requestId,
    requestedAt: dto.requestedAt,
    completedAt: dto.completedAt ?? null,
    expiresAt: dto.expiresAt ?? null,
    retryable: dto.retryable,
    packageAvailable: dto.packageAvailable,
  };
}

function createExportRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `export-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useUserDataExport(): UserDataExportHookResult {
  const { user, getIdToken } = useAuth();
  const [exportState, setExportState] = useState<UserDataExportViewState>(IDLE_STATE);
  const [loading, setLoading] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRetryable, setErrorRetryable] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const submitGuardRef = useRef(false);
  const userUidRef = useRef<string | null>(null);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    const uid = user?.uid ?? null;
    if (userUidRef.current !== uid) {
      userUidRef.current = uid;
      setExportState(IDLE_STATE);
      setError(null);
      setErrorRetryable(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setExportState(IDLE_STATE);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const token = await getIdToken(false);
        if (!token || cancelled) return;

        const res = await getLatestUserDataExport(token);
        if (cancelled) return;

        if (!res.ok) {
          const mapped = mapExportApiFailure(res);
          setError(mapped.message);
          setErrorRetryable(mapped.retryable);
          return;
        }

        if (!res.json.export) {
          setExportState(IDLE_STATE);
          return;
        }

        setExportState(toViewState({ ok: true, ...res.json.export }));
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
  }, [user, getIdToken, refreshKey]);

  const requestExport = useCallback(async () => {
    if (!user || submitGuardRef.current) return;
    if (exportState.status === "pending" || exportState.status === "requesting") return;
    if (exportState.status === "ready") return;

    submitGuardRef.current = true;
    setRequesting(true);
    setError(null);

    const clientRequestId = createExportRequestId();

    try {
      const token = await getIdToken(true);
      if (!token) {
        setError("Your session expired. Sign in again and retry.");
        setErrorRetryable(false);
        return;
      }

      setExportState((prev) => ({
        ...prev,
        status: "requesting",
        requestId: clientRequestId,
      }));

      const res = await requestUserDataExport(token, { clientRequestId });
      if (!res.ok) {
        const mapped = mapExportApiFailure(res);
        setError(mapped.message);
        setErrorRetryable(mapped.retryable);
        setExportState(IDLE_STATE);
        return;
      }

      const statusRes = await getUserDataExportStatus(token, res.json.requestId);
      if (!statusRes.ok) {
        const mapped = mapExportApiFailure(statusRes);
        setError(mapped.message);
        setErrorRetryable(mapped.retryable);
        return;
      }

      setExportState(toViewState(statusRes.json));
    } catch {
      setError("No connection. Check your network and try again.");
      setErrorRetryable(true);
      setExportState(IDLE_STATE);
    } finally {
      setRequesting(false);
      submitGuardRef.current = false;
    }
  }, [user, getIdToken, exportState.status]);

  const downloadExport = useCallback(async () => {
    if (!user || !exportState.requestId || exportState.status !== "ready") return;

    setDownloading(true);
    setError(null);

    try {
      const token = await getIdToken(true);
      if (!token) {
        setError("Your session expired. Sign in again and retry.");
        setErrorRetryable(false);
        return;
      }

      const res = await getUserDataExportDownload(token, exportState.requestId);
      if (!res.ok) {
        const mapped = mapExportApiFailure(res);
        setError(mapped.message);
        setErrorRetryable(mapped.retryable);
        return;
      }

      const download = await downloadAndShareUserDataExport({
        downloadUrl: res.json.downloadUrl,
        contentType: res.json.contentType,
      });

      if (!download.ok) {
        setError(download.message);
        setErrorRetryable(download.retryable);
      }
    } catch {
      setError("Could not download the export. Try again.");
      setErrorRetryable(true);
    } finally {
      setDownloading(false);
    }
  }, [user, getIdToken, exportState.requestId, exportState.status]);

  return {
    exportState,
    loading,
    requesting,
    downloading,
    error,
    errorRetryable,
    refresh,
    requestExport,
    downloadExport,
  };
}
