// lib/contracts/failure.ts

/**
 * Failure Memory DTOs (read-only UI surface).
 *
 * Source of truth: API runtime DTO validation (services/api).
 * Client must not invent semantics beyond these fields.
 */

export type FailureDetailsDto = Record<string, unknown> | null;

export type FailureListItemDto = {
  id: string;
  type: string;
  code: string;
  message: string;
  day: string; // YYYY-MM-DD

  /** ISO timestamp string */
  createdAt: string;

  timeZone?: string;
  observedAt?: string;
  rawEventId?: string;
  rawEventPath?: string;
  details?: FailureDetailsDto;
};

export type FailureListResponseDto = {
  items: FailureListItemDto[];
  nextCursor: string | null;
};
