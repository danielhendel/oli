/**
 * Deterministic search-token generation for Food Graph nodes (Phase B Task 1).
 *
 * Every node generates a sorted, de-duplicated set of tokens:
 *  - each normalized word of the name
 *  - the full normalized name as a phrase token
 *  - brand words + full brand phrase
 *  - alias words + alias phrases
 *
 * Examples:
 *  "Chicken Breast" → ["chicken", "breast", "chicken breast"]
 *  "Greek Yogurt"   → ["greek", "yogurt", "greek yogurt"]
 *  "Vitamin D3"     → ["vitamin", "d3", "vitamin d3"]
 *
 * Pure, no I/O, no `any`. Used at upsert time so persisted nodes can be queried
 * with Firestore `array-contains-any`.
 */

import { normalizeFoodText, tokenizeFoodText } from "./foodTextMatch";

export interface SearchTokenInput {
  name: string;
  brand?: string | undefined;
  aliases?: readonly string[] | undefined;
}

function addPhraseAndWords(target: Set<string>, raw: string): void {
  const phrase = normalizeFoodText(raw);
  if (phrase.length === 0) return;
  for (const word of tokenizeFoodText(phrase)) {
    target.add(word);
  }
  // Only add the multi-word phrase token when it differs from its single word.
  if (phrase.includes(" ")) {
    target.add(phrase);
  }
}

/** Generate deterministic, sorted search tokens for a node. */
export function buildFoodSearchTokens(input: SearchTokenInput): string[] {
  const tokens = new Set<string>();
  addPhraseAndWords(tokens, input.name);
  if (input.brand) addPhraseAndWords(tokens, input.brand);
  for (const alias of input.aliases ?? []) {
    addPhraseAndWords(tokens, alias);
  }
  return [...tokens].sort();
}
