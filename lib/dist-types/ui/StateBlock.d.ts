export type OfflineStateProps = {
    /** Short title (e.g. "Offline") */
    title: string;
    /** Message explaining when content will appear (e.g. "Health Score will load when connection is restored.") */
    message: string;
};
/**
 * Explicit offline state block. Use when status === "error" and reason === "network".
 * No color-only meaning: title and message convey state; not decorative.
 */
export declare function OfflineState({ title, message }: OfflineStateProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=StateBlock.d.ts.map