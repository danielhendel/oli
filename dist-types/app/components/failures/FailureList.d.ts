import type { FailureListItemDto } from "@/lib/contracts/failure";
export type FailureListProps = {
    items: FailureListItemDto[];
    truncated?: boolean;
    onItemPress?: (item: FailureListItemDto) => void;
};
export declare function FailureList({ items, truncated, onItemPress }: FailureListProps): import("react/jsx-runtime").JSX.Element;
