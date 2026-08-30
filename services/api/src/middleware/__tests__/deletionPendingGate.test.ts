/**
 * Unit tests: deletion-pending allowlist.
 */

import { isDeletionControlAllowlisted } from "../deletionPendingAllowlist";

describe("isDeletionControlAllowlisted", () => {
  it("allows delete status and delete POST", () => {
    expect(isDeletionControlAllowlisted("POST", "/account/delete")).toBe(true);
    expect(isDeletionControlAllowlisted("GET", "/delete/latest")).toBe(true);
    expect(isDeletionControlAllowlisted("GET", "/delete/abc-123")).toBe(true);
  });

  it("blocks product and export routes", () => {
    expect(isDeletionControlAllowlisted("GET", "/profile/main")).toBe(false);
    expect(isDeletionControlAllowlisted("POST", "/ingest")).toBe(false);
    expect(isDeletionControlAllowlisted("POST", "/export")).toBe(false);
    expect(isDeletionControlAllowlisted("GET", "/export/latest")).toBe(false);
    expect(isDeletionControlAllowlisted("GET", "/users/me/raw-events")).toBe(false);
  });
});
