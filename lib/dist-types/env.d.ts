export type AppEnvironment = "staging";
export declare const Env: Readonly<{
    EXPO_PUBLIC_ENVIRONMENT: AppEnvironment;
    EXPO_PUBLIC_BACKEND_BASE_URL: string;
    EXPO_PUBLIC_FIREBASE_API_KEY: string;
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    EXPO_PUBLIC_FIREBASE_APP_ID: string;
}>;
export declare function getEnv(): typeof Env;
export declare function getEnv(key: string): string | undefined;
//# sourceMappingURL=env.d.ts.map