import type { SleepViewDto } from "@oli/contracts";

import { pickPhysiologicalSleepAnchorFromVendorSleepView } from "../pickPhysiologicalSleepAnchorFromVendorSleepView";

const cal = "2026-05-13" as const;

function view(over: Partial<SleepViewDto>): SleepViewDto {
  return {
    isFallback: false,
    contributors: {},
    ...over,
  } as SleepViewDto;
}

describe("pickPhysiologicalSleepAnchorFromVendorSleepView", () => {
  it("returns resolved day when requested anchor matches and resolved is within trust window", () => {
    const out = pickPhysiologicalSleepAnchorFromVendorSleepView({
      calendarToday: cal,
      requestedSleepAnchorDay: "2026-05-12",
      sleepView: view({
        requestedDay: "2026-05-12",
        resolvedDay: "2026-05-11",
        day: "2026-05-11",
      }),
    });
    expect(out).toBe("2026-05-11");
  });

  it("returns null when aligned (requested === resolved === anchor)", () => {
    const out = pickPhysiologicalSleepAnchorFromVendorSleepView({
      calendarToday: cal,
      requestedSleepAnchorDay: "2026-05-11",
      sleepView: view({
        requestedDay: "2026-05-11",
        resolvedDay: "2026-05-11",
        day: "2026-05-11",
      }),
    });
    expect(out).toBeNull();
  });

  it("returns null for unrelated old resolved day (stale fallback)", () => {
    const out = pickPhysiologicalSleepAnchorFromVendorSleepView({
      calendarToday: cal,
      requestedSleepAnchorDay: "2026-05-12",
      sleepView: view({
        requestedDay: "2026-05-12",
        resolvedDay: "2026-04-19",
        day: "2026-04-19",
      }),
    });
    expect(out).toBeNull();
  });

  it("returns null for fallback vendor rows", () => {
    const out = pickPhysiologicalSleepAnchorFromVendorSleepView({
      calendarToday: cal,
      requestedSleepAnchorDay: "2026-05-12",
      sleepView: view({
        requestedDay: "2026-05-12",
        resolvedDay: "2026-05-11",
        isFallback: true,
      }),
    });
    expect(out).toBeNull();
  });
});
