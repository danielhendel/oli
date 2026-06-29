export function blockNotesPreview(notes: string, maxLength = 72): string | null {
  const trimmed = notes.trim();
  if (!trimmed) return null;
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, maxLength).trim()}…`;
}
