/**
 * Privacy-safe telemetry for SleepNight route-version markers.
 *
 * Closed payload only — no uid, day/date, scores, document IDs, URLs, tokens,
 * or raw errors. Correlation for status/route remains on `http_request_completed`.
 */

import { logger } from "./logger";

/** Exact-day SleepNight route version marker (aggregate only). */
export type SleepNightRouteVersionTelemetry = {
  msg: "[SLEEP_NIGHT_ROUTE_VERSION]";
  version: "sleep-night-resolution-v2";
};

/** Range SleepNight route marker (aggregate dayCount only). */
export type SleepNightRangeRouteTelemetry = {
  msg: "[SLEEP_NIGHT_RANGE_ROUTE]";
  version: "sleep-night-range-v1";
  dayCount: number;
};

export function logSleepNightRouteVersionTelemetry(): void {
  const event: SleepNightRouteVersionTelemetry = {
    msg: "[SLEEP_NIGHT_ROUTE_VERSION]",
    version: "sleep-night-resolution-v2",
  };
  logger.info(event);
}

export function logSleepNightRangeRouteTelemetry(dayCount: number): void {
  const event: SleepNightRangeRouteTelemetry = {
    msg: "[SLEEP_NIGHT_RANGE_ROUTE]",
    version: "sleep-night-range-v1",
    dayCount,
  };
  logger.info(event);
}
