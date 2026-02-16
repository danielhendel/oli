import type { EventSource } from "./schemas";

export const EVENT_SOURCES: ReadonlyArray<EventSource> = [
  "manual",
  "template",
  "past",
  "import:oura",
  "import:withings",
  "import:apple",
] as const;

export function isImportSource(src: EventSource): boolean {
  return src.startsWith("import:");
}
