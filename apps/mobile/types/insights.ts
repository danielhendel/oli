// apps/mobile/types/insights.ts
import { BaseDoc } from './common';

export type InsightSeverity = 'info' | 'notice' | 'warning' | 'critical';

export interface Insight extends BaseDoc {
  date: string; // ISO date for which this insight applies
  title: string;
  message: string;
  tags?: string[]; // e.g., ['recovery', 'training-load']
  severity?: InsightSeverity;
  relatedDocPaths?: string[]; // pointers to logs/facts used
}
