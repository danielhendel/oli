/**
 * Canonical field-level status for user-data inventory (Phase 3B).
 * A field may carry multiple issues — never collapse gaps into “missing.”
 */

export const USER_DATA_FIELD_STATUSES = [
  "present",
  "missing",
  "placeholder",
  "stale",
  "conflicting",
  "orphaned",
  "unsupported",
  "not_normalized",
  "not_displayed",
  "not_exported",
  "not_deletable",
] as const;

export type UserDataFieldStatus = (typeof USER_DATA_FIELD_STATUSES)[number];

export type UserDataFieldIssue = {
  status: Exclude<UserDataFieldStatus, "present">;
  summary: string;
};

export function isUserDataFieldStatus(value: string): value is UserDataFieldStatus {
  return (USER_DATA_FIELD_STATUSES as readonly string[]).includes(value);
}
