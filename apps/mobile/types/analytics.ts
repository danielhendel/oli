// apps/mobile/types/analytics.ts
import { BaseDoc } from './common';

export interface AnalyticsRollup extends BaseDoc {
  kind:
    | 'workout.volume.rolling'
    | 'workout.prs'
    | 'focus.heatmap'
    | 'cardio.pace.rolling'
    | 'nutrition.compliance'
    | 'recovery.trend';
  range: '7d' | '30d' | '90d' | 'ytd';
  data: unknown; // chart-ready payloads
}
