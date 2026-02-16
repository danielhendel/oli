export type RefreshTopic = "commandCenter";
/**
 * Typed per-topic payloads.
 */
export type RefreshPayloadByTopic = {
    commandCenter: {
        optimisticWeightKg?: number;
    };
};
export type RefreshEvent<TTopic extends RefreshTopic = RefreshTopic> = {
    topic: TTopic;
    key: string;
} & RefreshPayloadByTopic[TTopic];
type StorageLike = {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem?(key: string): Promise<void>;
};
export declare function emitRefresh(topic: "commandCenter", key: string, payload?: RefreshPayloadByTopic["commandCenter"]): void;
export declare function consumeRefresh(topic: RefreshTopic, key: string): void;
export declare function subscribeRefresh(cb: (ev: RefreshEvent) => void): () => void;
export declare function __testing_setStorage(s: StorageLike | null): void;
export declare function __testing_reset(): void;
export {};
//# sourceMappingURL=refreshBus.d.ts.map