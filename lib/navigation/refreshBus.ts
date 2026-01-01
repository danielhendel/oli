// lib/navigation/refreshBus.ts
// Simple in-memory refresh signal bus for RN (no EventTarget).

export type RefreshTopic = "commandCenter";

type Listener = (payload: { topic: RefreshTopic; key: string }) => void;

const listeners = new Set<Listener>();

export function emitRefresh(topic: RefreshTopic, key: string): void {
  for (const l of listeners) l({ topic, key });
}

export function subscribeRefresh(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
