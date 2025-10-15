// apps/mobile/types/recovery.ts
import { BaseDoc } from './common';

export interface RecoveryLog extends BaseDoc {
  date: string;                   // ISO date
  sleepHours?: number;
  sleepLatencyMin?: number;
  hrvMs?: number;
  restingHr?: number;
  readinessScore?: number;        // generic 0–100
  sorenessScore?: number;         // 0–10 subjective
  notes?: string;
}
