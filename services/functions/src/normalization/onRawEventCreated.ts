// services/functions/src/normalization/onRawEventCreated.ts

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import * as logger from 'firebase-functions/logger';
import { db } from '../firebaseAdmin';
import type { RawEvent } from '../types/health';
import { mapRawEventToCanonical } from './mapRawEventToCanonical';

/**
 * Firestore trigger:
 *   Input:  /users/{userId}/rawEvents/{rawEventId}
 *   Output: /users/{userId}/events/{canonicalEventId}
 *
 * Behavior:
 * - Maps RawEvent → CanonicalEvent via pure mapper.
 * - Logs failures (no silent drops).
 * - Avoids logging any user PII.
 */
export const onRawEventCreated = onDocumentCreated(
  {
    document: 'users/{userId}/rawEvents/{rawEventId}',
    region: 'us-central1',
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const rawEvent = snapshot.data() as RawEvent;
    const result = mapRawEventToCanonical(rawEvent);

    if (!result.ok) {
      logger.warn('Normalization failed', {
        userId: rawEvent.userId,
        rawEventId: rawEvent.id,
        provider: rawEvent.provider,
        kind: rawEvent.kind,
        reason: result.reason,
      });
      return;
    }

    const canonical = result.canonical;

    await db
      .collection('users')
      .doc(rawEvent.userId)
      .collection('events')
      .doc(canonical.id)
      .set(canonical);
  },
);
