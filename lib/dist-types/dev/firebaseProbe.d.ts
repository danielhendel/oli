/**
 * Staging-only posture: we do NOT rely on direct client Firestore probes.
 * The product boundary is Cloud Run API + Firebase Auth.
 *
 * Use /debug/health and /debug/api-smoke for connectivity.
 */
export type FirebaseProbeResult = {
    ok: true;
} | {
    ok: false;
    message: string;
};
export declare const runFirebaseProbe: () => Promise<FirebaseProbeResult>;
//# sourceMappingURL=firebaseProbe.d.ts.map