/**
 * Sprint 4 — Offline banner for Timeline & Library.
 *
 * Shown when showing cached content after network failure.
 * Non-intrusive, no prompts/nags.
 */
import React from "react";
export type OfflineBannerProps = {
    /** true when displaying cached content due to network unavailability */
    isOffline?: boolean;
};
export declare function OfflineBanner({ isOffline }: OfflineBannerProps): React.ReactNode;
//# sourceMappingURL=OfflineBanner.d.ts.map