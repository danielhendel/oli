// apps/mobile/types/uploads.ts
import { BaseDoc } from './common';

export interface UploadMeta extends BaseDoc {
  kind: 'dexascan' | 'labs' | 'dna' | 'other';
  filePath: string;       // Storage path, e.g., "uid/UPLOADS/2025-10-14/dexa.pdf"
  fileName: string;
  sizeBytes: number;
  contentType?: string;
  takenAt?: number;       // when the measurement happened
  notes?: string;
}
