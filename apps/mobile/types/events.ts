// apps/mobile/types/events.ts
import { BaseDoc, DataDomain, Provider } from './common';

export type EventKind =
  | 'workout.logged'
  | 'cardio.logged'
  | 'nutrition.logged'
  | 'recovery.logged'
  | 'device.sync'
  | 'upload.added';

export interface EventEnvelope<TPayload = unknown> extends BaseDoc {
  kind: EventKind;
  domain: DataDomain;
  provider: Provider;
  payload: TPayload; // raw payload; normalization will translate to logs/*
  // append-only rule will be enforced in Rules
}
