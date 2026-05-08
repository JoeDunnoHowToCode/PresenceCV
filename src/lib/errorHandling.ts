/**
 * errorHandling.ts — Structured Firestore Error Handling
 *
 * Provides a standardized error logging and re-throwing mechanism for Firestore operations.
 *
 * Exports:
 * - FirestoreErrorInfo: Interface describing the structured error payload
 * - handleFirestoreError(error, operationType, path?): Logs a JSON-formatted error
 *   to console.error and re-throws it as a serialized Error. This makes Firestore
 *   permission errors easier to debug by including operation type, document path,
 *   and auth state information.
 *
 * Consumed by: EditPage.tsx (share link creation)
 */
export interface FirestoreErrorInfo {
  error: string;
  operationType: 'create' | 'update' | 'delete' | 'list' | 'get' | 'write';
  path: string | null;
  authInfo: {
    userId: string;
    email: string;
    emailVerified: boolean;
    isAnonymous: boolean;
    providerInfo: { providerId: string; displayName: string; email: string; }[];
  }
}

export function handleFirestoreError(error: any, operationType: FirestoreErrorInfo['operationType'], path: string | null = null) {
  const authInfo = {
    userId: 'unauthenticated',
    email: '',
    emailVerified: false,
    isAnonymous: true,
    providerInfo: []
  };

  const errorInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo
  };
  console.error("Firestore Error:", JSON.stringify(errorInfo, null, 2));
  throw new Error(JSON.stringify(errorInfo));
}
