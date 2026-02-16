import type { FailureListItemDto } from "@/lib/contracts/failure";
export type FailureDetailsModalProps = {
    item: FailureListItemDto;
    onClose: () => void;
};
export declare function FailureDetailsModal({ item, onClose }: FailureDetailsModalProps): import("react/jsx-runtime").JSX.Element;
