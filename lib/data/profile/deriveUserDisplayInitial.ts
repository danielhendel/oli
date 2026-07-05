export type DeriveUserDisplayInitialInput = {
  firstName?: string | null;
  displayName?: string | null;
  email?: string | null;
};

function firstCharUpper(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length === 0) return null;
  return trimmed.charAt(0).toUpperCase();
}

/** Avatar initial for settings/profile chrome — profile first name, then auth display name, then email. */
export function deriveUserDisplayInitial(input: DeriveUserDisplayInitialInput): string {
  return (
    firstCharUpper(input.firstName) ??
    firstCharUpper(input.displayName) ??
    firstCharUpper(input.email) ??
    "O"
  );
}
