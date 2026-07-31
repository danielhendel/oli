/**
 * Pure / injectable helpers for deleting Document OS artifacts on account delete.
 */
import { DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS, documentAccountStoragePrefixes } from "../../../../lib/data/documents/documentAccountLifecycle";

export { DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS, documentAccountStoragePrefixes };

export type StorageDeleteResult = {
  prefix: string;
  deletedCount: number;
  errors: string[];
};

export type DocumentAccountDeletePlan = {
  firestoreCollections: readonly string[];
  storagePrefixes: readonly string[];
};

export function planDocumentAccountDelete(uid: string): DocumentAccountDeletePlan {
  return {
    firestoreCollections: [...DOCUMENT_ACCOUNT_FIRESTORE_COLLECTIONS],
    storagePrefixes: [...documentAccountStoragePrefixes(uid)],
  };
}

/**
 * Delete all objects under a prefix. Idempotent when objects are already gone.
 * `listFiles` / `deleteFile` are injected for testability.
 */
export async function deleteStoragePrefix(args: {
  prefix: string;
  listFiles: (prefix: string) => Promise<string[]>;
  deleteFile: (objectPath: string) => Promise<void>;
}): Promise<StorageDeleteResult> {
  const errors: string[] = [];
  let deletedCount = 0;
  let files: string[] = [];
  try {
    files = await args.listFiles(args.prefix);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "list_failed");
    return { prefix: args.prefix, deletedCount: 0, errors };
  }

  for (const objectPath of files) {
    try {
      await args.deleteFile(objectPath);
      deletedCount += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "delete_failed";
      // Treat not-found as success (idempotent retry).
      if (/not.?found|no such object/i.test(msg)) {
        deletedCount += 1;
      } else {
        errors.push(msg);
      }
    }
  }

  return { prefix: args.prefix, deletedCount, errors };
}
