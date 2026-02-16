export type AdminAuthResult = {
    ok: true;
    uid: string;
    claims: Record<string, unknown>;
} | {
    ok: false;
    status: number;
    message: string;
};
/**
 * Verifies Firebase ID token and requires `admin: true` custom claim.
 *
 * Send header:
 * Authorization: Bearer <ID_TOKEN>
 */
export declare const requireAdmin: (authorizationHeader: string | undefined) => Promise<AdminAuthResult>;
//# sourceMappingURL=adminAuth.d.ts.map