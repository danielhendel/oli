import type { FailureListItemDto } from "@/lib/contracts/failure";
export type FailureListProps = {
    items: FailureListItemDto[];
    truncated?: boolean;
};
export declare function FailureList({ items, truncated }: FailureListProps): import("react/jsx-runtime").JSX.Element;
