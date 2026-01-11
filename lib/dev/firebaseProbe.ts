// lib/dev/firebaseProbe.ts
/**
 * Staging-only posture: we do NOT rely on direct client Firestore probes.
 * The product boundary is Cloud Run API + Firebase Auth.
 *
 * Use /debug/health and /debug/api-smoke for connectivity.
 */

export type FirebaseProbeResult =
  | { ok: true }
  | { ok: false; message: string };

export const runFirebaseProbe = async (): Promise<FirebaseProbeResult> => {
  return {
    ok: false,
    message:
      "Firebase probe disabled (staging-only, API-boundary). Use Debug → Backend Health.",
  };
};
