export type ModuleId = "body" | "training" | "nutrition" | "recovery" | "labs" | "settings";

export type ModuleSection = {
  id: string;
  title: string;
  subtitle?: string;
  href: `/(app)/${string}`;
  disabled?: boolean;
};

export const MODULE_SECTIONS: Record<ModuleId, ModuleSection[]> = {
  body: [
    { id: "overview", title: "Overview", subtitle: "Snapshot + key trends", href: "/(app)/body/overview" },
    { id: "recent", title: "Recent metrics", subtitle: "Latest entries and deltas", href: "/(app)/body/recent" },
    { id: "timeline", title: "Timeline", subtitle: "Long-term trends", href: "/(app)/body/timeline" },
  ],
  training: [
    { id: "today", title: "Today", subtitle: "Start/log a session", href: "/(app)/workouts/today" },
    { id: "recent", title: "Recent sessions", subtitle: "History + consistency", href: "/(app)/workouts/recent" },
    { id: "progress", title: "Progress", subtitle: "Strength + performance trends", href: "/(app)/workouts/progress" },
  ],
  nutrition: [
    { id: "today", title: "Today", subtitle: "Daily macro progress", href: "/(app)/nutrition/today" },
    { id: "targets", title: "Targets", subtitle: "Macros + micros targets", href: "/(app)/nutrition/targets" },
    { id: "trends", title: "Trends", subtitle: "Weekly averages", href: "/(app)/nutrition/trends" },
  ],
  recovery: [
    { id: "sleep", title: "Sleep", subtitle: "Duration + quality", href: "/(app)/recovery/sleep", disabled: true },
    { id: "readiness", title: "Readiness", subtitle: "Recovery status", href: "/(app)/recovery/readiness", disabled: true },
    { id: "signals", title: "Signals", subtitle: "HRV, RHR, stress", href: "/(app)/recovery/signals", disabled: true },
  ],
  labs: [
    { id: "latest", title: "Latest panel", subtitle: "Newest snapshot", href: "/(app)/labs/latest", disabled: true },
    { id: "trends", title: "Trends", subtitle: "History + deltas", href: "/(app)/labs/trends", disabled: true },
    { id: "insights", title: "Insights", subtitle: "Flags + context", href: "/(app)/labs/insights", disabled: true },
  ],
  settings: [
    { id: "account", title: "Account", subtitle: "Profile + auth", href: "/(app)/settings/account" },
    { id: "privacy", title: "Privacy", subtitle: "Data controls", href: "/(app)/settings/privacy" },
    { id: "devices", title: "Devices", subtitle: "Integrations", href: "/(app)/settings/devices" },
  ],
};
