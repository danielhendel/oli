// lib/account/export.ts
export async function requestDataExport(): Promise<Blob> {
    // Call your Cloud Run export endpoint in a later backend sprint.
    // For now, return a small JSON stub so Settings UI is functional for Apple review.
    const data = { version: 1, note: "Export coming soon", items: [] as unknown[] };
    return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  }
  