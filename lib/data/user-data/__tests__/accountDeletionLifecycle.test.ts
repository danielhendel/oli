import { describe, expect, it } from "@jest/globals";

import { ACCOUNT_DELETION_FIRESTORE_COLLECTIONS } from "../accountDeletionFirestoreCollections";
import { USER_DATA_RETENTION_REGISTRY } from "../userDataRetentionRegistry";
import {
  assertLifecycleCoverageComplete,
  countBlockedOrUnknownP0,
} from "../userDataLifecycleClassification";

describe("accountDeletionFirestoreCollections", () => {
  it("includes all delete-required user subcollections from retention registry", () => {
    const workerSet = new Set(ACCOUNT_DELETION_FIRESTORE_COLLECTIONS);
    const missing: string[] = [];

    for (const entry of Object.values(USER_DATA_RETENTION_REGISTRY)) {
      if (!entry.deleteRequired) continue;
      if (entry.path.startsWith("users/{uid}/")) {
        const segment = entry.path.split("/")[2]?.replace(/\{.*\}/, "");
        if (!segment) continue;
        if (!workerSet.has(segment as (typeof ACCOUNT_DELETION_FIRESTORE_COLLECTIONS)[number])) {
          missing.push(entry.pathId);
        }
      }
    }

    expect(missing).toEqual([]);
  });
});

describe("userDataLifecycleClassification", () => {
  it("has no BLOCKED P0 lifecycle entries", () => {
    expect(countBlockedOrUnknownP0()).toBe(0);
    expect(() => assertLifecycleCoverageComplete()).not.toThrow();
  });
});
