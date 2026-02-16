/** Pure helper: figure out which auth providers are available.
 *  No React Native or Firebase imports here so it’s safe for Jest/Node.
 */
export function resolveAvailableAuthProviders(input: {
    appleAvailable: boolean;
    googleClientId?: string | null;
  }): Array<"apple" | "google"> {
    const out: Array<"apple" | "google"> = [];
    if (input.appleAvailable) out.push("apple");
    if (input.googleClientId && input.googleClientId.length > 0) out.push("google");
    return out;
  }
  