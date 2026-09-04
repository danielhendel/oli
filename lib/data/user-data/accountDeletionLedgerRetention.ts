/**
 * Account deletion durable-ledger retention helpers (ADR v1).
 */

import {
  ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
  accountDeletionLedgerExpireAt,
} from "@oli/contracts";

export {
  ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
  accountDeletionLedgerExpireAt,
};

/** Fields forbidden on retained completed/failed ledger documents. */
export const ACCOUNT_DELETION_LEDGER_FORBIDDEN_FIELDS = [
  "storageDelete",
  "email",
  "password",
  "token",
  "tokens",
  "signedUrl",
  "exportPath",
  "storagePath",
] as const;

export type AccountDeletionLedgerMinimizedPatch = {
  expireAt: Date;
  retentionDays: typeof ACCOUNT_DELETION_LEDGER_RETENTION_DAYS;
};
