/**
 * Unit tests: account deletion ledger retention / expireAt.
 */

import {
  ACCOUNT_DELETION_LEDGER_RETENTION_DAYS,
  accountDeletionLedgerExpireAt,
} from "@oli/contracts";

describe("accountDeletionLedgerExpireAt", () => {
  it("adds exactly 90 days in UTC milliseconds", () => {
    const anchor = new Date("2026-01-01T00:00:00.000Z");
    const expire = accountDeletionLedgerExpireAt(anchor);
    expect(ACCOUNT_DELETION_LEDGER_RETENTION_DAYS).toBe(90);
    expect(expire.toISOString()).toBe("2026-04-01T00:00:00.000Z");
  });
});
