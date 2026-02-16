// lib/integrations/providers.ts
export type ProviderKey = "oura" | "withings";

export const PROVIDERS: Record<
  ProviderKey,
  { label: string; scopes: string[]; color: string }
> = {
  oura: { label: "Oura", scopes: ["daily", "heartrate", "workout", "session", "tag"], color: "#000000" },
  withings: { label: "Withings", scopes: ["user.metrics", "user.activity", "user.sleep"], color: "#2B7BE4" },
};
