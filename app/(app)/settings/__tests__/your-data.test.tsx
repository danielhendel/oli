import React, { act } from "react";
import renderer from "react-test-renderer";

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: "SafeAreaView",
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock("@/lib/ui/navigation/useFloatingTabBarScrollPadding", () => ({
  useFloatingTabBarScrollPadding: (extra: number) => extra + 0,
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import { YourDataScreen } from "@/lib/ui/settings/YourDataScreen";
import { buildUserDataInventoryViewModel } from "@/lib/data/user-data/buildUserDataInventoryViewModel";

const idleExportHook = {
  exportState: {
    status: "idle" as const,
    requestId: null,
    requestedAt: null,
    completedAt: null,
    expiresAt: null,
    retryable: true,
    packageAvailable: false,
    failureCategory: "none" as const,
  },
  loading: false,
  requesting: false,
  downloading: false,
  error: null,
  errorRetryable: false,
  errorRetryKind: null as const,
  refresh: () => undefined,
  requestExport: async () => undefined,
  downloadExport: async () => undefined,
};

describe("Your Data screen", () => {
  it("renders source and record statuses without collection names or private values", async () => {
    const inventory = buildUserDataInventoryViewModel({
      authPresent: true,
      ouraConnected: true,
      appleHealthConnected: true,
      labUploadCountCategory: "none",
      withingsFirestoreConnectedFlag: true,
    });

    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <YourDataScreen state="ready" inventory={inventory} error={null} onRefresh={() => undefined} exportHook={idleExportHook} />,
      );
    });

    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("your-data-screen");
    expect(str).toContain("Connected sources");
    expect(str).toContain("Health records");
    expect(str).toContain("Withings");
    expect(str).toContain("Previously connected");
    expect(str).not.toContain("Connected\",\"title\":\"Withings");
    expect(str).toContain("Not set up");
    expect(str).not.toMatch(/labUploads|rawEvents|users\/\{uid\}/);
    expect(str).not.toMatch(/LDL|HDL|mg\/dL/);
    expect(str).not.toContain("settings/your-data");
    expect(str).toContain("your-data-export-card");
    expect(str).toContain("Request export");
    expect(str).toContain("Processing is asynchronous");
    expect(str).toContain("You can leave this screen and return later");
    expect(str).toContain("Refresh inventory");
    expect(str).not.toContain("Delete my account");
    expect(str).not.toMatch(/"fontWeight":"900"/);
  });

  it("keeps Ready visible when retrieval fails and retry opens download", async () => {
    const readyRetrievalError = {
      ...idleExportHook,
      exportState: {
        ...idleExportHook.exportState,
        status: "ready" as const,
        requestedAt: "2026-08-29T17:40:22.000Z",
        expiresAt: "2026-09-05T17:40:22.000Z",
        packageAvailable: true,
        failureCategory: "none" as const,
      },
      error: "Your export is ready, but the file could not be opened. Try again.",
      errorRetryable: true,
      errorRetryKind: "download" as const,
    };
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <YourDataScreen
          state="ready"
          inventory={inventory}
          error={null}
          onRefresh={() => undefined}
          exportHook={readyRetrievalError}
        />,
      );
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Export ready");
    expect(str).toContain("could not be opened");
    expect(str).toContain("Retry download");
    expect(str).toContain("Download / share");
    expect(str).toContain("Processing is asynchronous");
    expect(str).toContain("You can leave this screen and return later");
    expect(str).not.toContain("Retry status refresh");
    expect(str).not.toContain("Export in progress");
    expect(str).not.toContain("https://");
  });

  it("offers status-refresh recovery for offline Ready without inventing download retry", async () => {
    const offlineReady = {
      ...idleExportHook,
      exportState: {
        ...idleExportHook.exportState,
        status: "ready" as const,
        requestedAt: "2026-08-29T17:40:22.000Z",
        expiresAt: "2026-09-05T17:40:22.000Z",
        packageAvailable: true,
        failureCategory: "none" as const,
      },
      error: "No connection. Check your network and try again.",
      errorRetryable: true,
      errorRetryKind: "refresh" as const,
    };
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <YourDataScreen
          state="ready"
          inventory={inventory}
          error={null}
          onRefresh={() => undefined}
          exportHook={offlineReady}
        />,
      );
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Export ready");
    expect(str).toContain("Available until");
    expect(str).toContain("No connection");
    expect(str).toContain("Retry status refresh");
    expect(str).toContain("Refresh export status");
    expect(str).not.toContain("Retry download");
  });

  it("keeps request button visible while requesting with clear busy label", async () => {
    const requestingHook = {
      ...idleExportHook,
      requesting: true,
      exportState: {
        ...idleExportHook.exportState,
        status: "failed" as const,
        failureCategory: "stale_pending" as const,
      },
    };
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <YourDataScreen
          state="ready"
          inventory={inventory}
          error={null}
          onRefresh={() => undefined}
          exportHook={requestingHook}
        />,
      );
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Requesting…");
    expect(str).toContain("your-data-export-request");
  });

  it("shows recoverable copy for stale failed export", async () => {
    const staleHook = {
      ...idleExportHook,
      exportState: {
        ...idleExportHook.exportState,
        status: "failed" as const,
        requestedAt: "2026-01-25T16:47:47.201Z",
        failureCategory: "stale_pending" as const,
        retryable: true,
      },
    };
    const inventory = buildUserDataInventoryViewModel({ authPresent: true });
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <YourDataScreen
          state="ready"
          inventory={inventory}
          error={null}
          onRefresh={() => undefined}
          exportHook={staleHook}
        />,
      );
    });
    const str = JSON.stringify(test.toJSON());
    expect(str).toContain("Your previous export could not be completed");
    expect(str).toContain("Request new export");
    expect(str).toContain("Refresh export status");
    expect(str).not.toContain("Export in progress");
  });

  it("shows loading state", async () => {
    let test!: renderer.ReactTestRenderer;
    await act(async () => {
      test = renderer.create(
        <YourDataScreen
          state="loading"
          inventory={null}
          error={null}
          onRefresh={() => undefined}
          exportHook={idleExportHook}
        />,
      );
    });
    expect(JSON.stringify(test.toJSON())).toContain("your-data-loading");
  });
});
