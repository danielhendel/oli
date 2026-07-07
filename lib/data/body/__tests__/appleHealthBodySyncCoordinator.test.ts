import {
  __testing_resetAppleHealthBodySyncCoordinator,
  runAppleHealthBodySyncSerialized,
} from "@/lib/data/body/appleHealthBodySyncCoordinator";

describe("runAppleHealthBodySyncSerialized", () => {
  beforeEach(() => {
    __testing_resetAppleHealthBodySyncCoordinator();
  });

  it("runs only one ingest at a time across callers", async () => {
    let runs = 0;
    const slow = () =>
      new Promise<{ ok: boolean }>((resolve) => {
        runs += 1;
        setTimeout(() => resolve({ ok: true }), 30);
      });

    const first = runAppleHealthBodySyncSerialized(slow);
    const second = runAppleHealthBodySyncSerialized(slow);
    const [a, b] = await Promise.all([first, second]);
    expect(runs).toBe(1);
    expect(a).toEqual({ ok: true });
    expect(b).toEqual({ ok: true });
  });
});
