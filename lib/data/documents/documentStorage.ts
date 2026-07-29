/**
 * Storage object identity helpers for Document Ingestion OS (pure).
 * Preferred path: users/{uid}/documents/{documentId}/original
 * Never expose these paths in consumer UI.
 */

export function buildDocumentStorageObjectId(args: {
  userId: string;
  documentId: string;
}): string {
  return `users/${args.userId}/documents/${args.documentId}/original`;
}

export function isDocumentStorageObjectId(objectId: string): boolean {
  return /^users\/[^/]+\/documents\/[^/]+\/original$/.test(objectId);
}
