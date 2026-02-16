export type AuthActionResult = {
    ok: true;
} | {
    ok: false;
    title: string;
    message: string;
};
export declare const signInWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
export declare const signUpWithEmail: (email: string, password: string) => Promise<AuthActionResult>;
export declare const signOutUser: () => Promise<void>;
//# sourceMappingURL=actions.d.ts.map