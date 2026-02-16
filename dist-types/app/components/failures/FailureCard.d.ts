import type { FailureListItemDto } from "@/lib/contracts/failure";
export type FailureCardProps = {
    item: FailureListItemDto;
    onPress?: () => void;
};
export declare function FailureCard({ item, onPress }: FailureCardProps): import("react/jsx-runtime").JSX.Element;
