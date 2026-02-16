export type Uid = string;
export type TraceId = string;

export interface EnqueueResult { jobId: string }

export interface IngestEvent {
  type: string;
  source?: string;
  occurredAt?: string; // ISO string
  payload: Record<string, unknown>;
}
