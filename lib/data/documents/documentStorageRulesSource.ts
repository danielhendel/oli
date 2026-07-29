/**
 * Deny-all Firebase Storage rules for Document OS Model A (server-only Admin SDK).
 * Client SDK must not read/write Storage objects. Cloud Run / Functions Admin SDK bypasses rules.
 *
 * Wired via firebase.json when Storage rules are deployed with the project.
 */
export const DOCUMENT_STORAGE_RULES_SOURCE = `rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Model A — Document Ingestion OS / general app Storage:
    // no client SDK read/write. Server Admin SDK bypasses these rules.
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
` as const;
