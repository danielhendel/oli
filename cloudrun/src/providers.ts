// cloudrun/src/providers.ts
export type ProviderKey = "oura" | "withings";

export type Provider = {
  key: ProviderKey;
  auth: {
    authorizeUrl: string;
    tokenUrl: string;
    scopes: string[];
    // you can add clientId/secret via env
  };
};

export const providers: Record<ProviderKey, Provider> = {
  oura: {
    key: "oura",
    auth: {
      authorizeUrl: "https://cloud.ouraring.com/oauth/authorize",
      tokenUrl: "https://api.ouraring.com/oauth/token",
      scopes: ["daily", "heartrate", "workout", "session", "tag"]
    }
  },
  withings: {
    key: "withings",
    auth: {
      authorizeUrl: "https://account.withings.com/oauth2_user/authorize2",
      tokenUrl: "https://wbsapi.withings.net/v2/oauth2",
      scopes: ["user.metrics", "user.activity", "user.sleep"]
    }
  }
};
