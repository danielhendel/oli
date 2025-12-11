// apps/mobile/lib/api/ingest.ts

/**
 * Oli Health OS — Ingestion API Client
 *
 * Strongly typed wrapper for calling the ingestRawEventHttp callable function.
 */

import { getFunctions, httpsCallable } from "firebase/functions";
import { getFirebaseAuth } from "@/lib/firebaseClient";
import type {
  CanonicalEventKind,
  IsoDateTimeString
} from "@/types/health";

export interface IngestRawEventRequest {
  sourceId: string;
  sourceType: string; // mobile can pass specific source types; backend validates as HealthSourceType
  provider: string;
  kind: CanonicalEventKind;
  observedAt: IsoDateTimeString;
  payload: unknown;
}

export interface IngestRawEventResponse {
  ok: boolean;
  rawEvent?: {
    id: string;
    userId: string;
    provider: string;
    kind: CanonicalEventKind;
    observedAt: IsoDateTimeString;
    receivedAt: IsoDateTimeString;
    payload: unknown;
  };
  error?: string;
}

/**
 * Sends a raw event to the backend via the callable ingestion function.
 */
export async function ingestRawEventFromApp(
  input: IngestRawEventRequest
): Promise<IngestRawEventResponse> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;

  if (!user) {
    throw new Error("User must be signed in to ingest events");
  }

  // Firebase client SDK will include the user auth token automatically.
  const functions = getFunctions();

  const fn = httpsCallable<IngestRawEventRequest, IngestRawEventResponse>(
    functions,
    "ingestRawEventHttp"
  );

  const response = await fn(input);
  return response.data;
}
