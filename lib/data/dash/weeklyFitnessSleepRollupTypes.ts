import type { DaySleepRollupEntry } from "@/lib/data/dash/dailyFactsSleepRollupEntry";
import type { DayKey } from "@/lib/ui/calendar/types";

export type SleepMinutesRollupMap = Record<DayKey, DaySleepRollupEntry>;
