import React, { type PropsWithChildren } from "react";
import type { User } from "firebase/auth";
export type AuthContextValue = {
    user: User | null;
    initializing: boolean;
    getIdToken: (forceRefresh?: boolean) => Promise<string | null>;
    signOutUser: () => Promise<void>;
    signOut: () => Promise<void>;
};
export declare const AuthProvider: ({ children }: PropsWithChildren) => React.ReactElement;
export declare const useAuth: () => AuthContextValue;
//# sourceMappingURL=AuthProvider.d.ts.map