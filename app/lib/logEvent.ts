// app/lib/logEvent.ts
import { apiFetch } from "./apiClient";

export type RawEvent = {
  type: string;
  version: string;
  uid?: string;
  ts?: number;
  // allow extra, but not any
  [k: string]: unknown;
};

export async function logEvent(idToken: string, event: RawEvent) {
  const idempotencyKey = Math.random().toString(36).slice(2);
  await apiFetch("/events", {
    method: "POST",
    body: JSON.stringify(event),
    idToken,
    idempotencyKey,
  });
}

export async function requestExport(idToken: string) {
  await apiFetch("/export", { method: "POST", body: "{}", idToken });
}
