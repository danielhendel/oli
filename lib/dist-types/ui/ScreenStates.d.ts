/**
 * Sprint 3 — Shared UI primitives for fail-closed, loading, empty states.
 * Apple Health / Linear baseline: restrained, typography-led.
 */
import React from "react";
export type ScreenContainerProps = {
    children: React.ReactNode;
    edges?: ("top" | "bottom" | "left" | "right")[];
};
export declare function ScreenContainer({ children, edges }: ScreenContainerProps): import("react/jsx-runtime").JSX.Element;
export type ErrorStateProps = {
    title?: string;
    message: string;
    requestId?: string | null;
    onRetry?: () => void;
    /** Set when kind:"contract" for user-friendly data validation message */
    isContractError?: boolean;
};
export declare function ErrorState({ title, message, requestId, onRetry, isContractError, }: ErrorStateProps): import("react/jsx-runtime").JSX.Element;
export type LoadingStateProps = {
    message?: string;
};
export declare function LoadingState({ message }: LoadingStateProps): import("react/jsx-runtime").JSX.Element;
export type EmptyStateProps = {
    title: string;
    description?: string;
    /** Sprint 4 — Optional explanatory text (e.g. "Try a different date range") */
    explanation?: string;
};
export declare function EmptyState({ title, description, explanation }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ScreenStates.d.ts.map