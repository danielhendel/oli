// lib/ui/eventBus.ts
type Handler = (payload: unknown) => void;
const handlers: Record<string, Set<Handler>> = {};

export function on(topic: string, fn: Handler): () => void {
  if (!handlers[topic]) handlers[topic] = new Set();
  handlers[topic].add(fn);
  return () => handlers[topic]?.delete(fn); // ← optional chaining
}

export function emit(topic: string, payload: unknown): void {
  handlers[topic]?.forEach((fn) => fn(payload));
}
