import { randomUUID } from 'node:crypto';
export const newTraceId = () => randomUUID().replace(/-/g, '');
