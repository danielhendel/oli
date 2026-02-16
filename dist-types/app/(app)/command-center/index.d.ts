import type { DerivedLedgerReplayResponseDto } from "@/lib/contracts/derivedLedger";
type Props = {
    focusNonce?: number;
    refreshKey?: string | null;
    optimisticWeightKg?: number | null;
    replayOverride?: DerivedLedgerReplayResponseDto | null;
    replayLoading?: boolean;
    replayError?: string | null;
    replayMissing?: boolean;
};
export default function CommandCenterScreen(props: Props): import("react/jsx-runtime").JSX.Element;
export {};
