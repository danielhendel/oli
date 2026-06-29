import { createId } from "./ids";

export function linesToItems(
  value: string,
  prefix: "cue" | "mistake" | "feel" | "nofeel" | "prog",
): { id: string; text: string }[] {
  return value
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ id: createId(prefix), text }));
}

export function linesFromItems(items: { text: string }[]): string {
  return items.map((item) => item.text).join("\n");
}

export function linesFromStrings(values: string[]): string {
  return values.join("\n");
}

export function parseLines(value: string): string[] {
  return value
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean);
}
