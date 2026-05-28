/**
 * deleteRefreshToken must be idempotent when custody was already removed
 * (e.g. performReconnectCleanupBestEffort after token refresh failure).
 */

const mockListSecretVersions = jest.fn();
const mockDestroySecretVersion = jest.fn();

jest.mock("@google-cloud/secret-manager", () => ({
  SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
    listSecretVersions: mockListSecretVersions,
    destroySecretVersion: mockDestroySecretVersion,
  })),
}));

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getProjectId: jest.fn().mockResolvedValue("oli-staging-fdbba"),
  })),
}));

const { deleteRefreshToken } = require("../ouraSecrets") as {
  deleteRefreshToken: (uid: string) => Promise<void>;
};

describe("deleteRefreshToken", () => {
  const originalProject = process.env.GOOGLE_CLOUD_PROJECT;

  beforeAll(() => {
    process.env.GOOGLE_CLOUD_PROJECT = "oli-staging-fdbba";
  });

  afterAll(() => {
    if (originalProject === undefined) {
      delete process.env.GOOGLE_CLOUD_PROJECT;
    } else {
      process.env.GOOGLE_CLOUD_PROJECT = originalProject;
    }
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockDestroySecretVersion.mockResolvedValue([{}]);
  });

  it("no-ops when secret parent is NOT_FOUND", async () => {
    mockListSecretVersions.mockRejectedValueOnce(new Error("NOT_FOUND: secret missing"));
    await expect(deleteRefreshToken("user_test")).resolves.toBeUndefined();
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("skips versions already in DESTROYED state", async () => {
    mockListSecretVersions.mockResolvedValueOnce([
      [{ name: "projects/p/secrets/s/versions/1", state: "DESTROYED" }],
    ]);
    await expect(deleteRefreshToken("user_test")).resolves.toBeUndefined();
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("ignores FAILED_PRECONDITION when destroy races an already-destroyed version", async () => {
    mockListSecretVersions.mockResolvedValueOnce([
      [{ name: "projects/p/secrets/s/versions/2", state: "ENABLED" }],
    ]);
    mockDestroySecretVersion.mockRejectedValueOnce(
      new Error("9 FAILED_PRECONDITION: SecretVersion.state is already DESTROYED."),
    );
    await expect(deleteRefreshToken("user_test")).resolves.toBeUndefined();
    expect(mockDestroySecretVersion).toHaveBeenCalledTimes(1);
  });

  it("destroys ENABLED versions when present", async () => {
    mockListSecretVersions.mockResolvedValueOnce([
      [
        { name: "projects/p/secrets/s/versions/1", state: "DESTROYED" },
        { name: "projects/p/secrets/s/versions/2", state: "ENABLED" },
      ],
    ]);
    await deleteRefreshToken("user_test");
    expect(mockDestroySecretVersion).toHaveBeenCalledTimes(1);
    expect(mockDestroySecretVersion).toHaveBeenCalledWith({
      name: "projects/p/secrets/s/versions/2",
    });
  });
});
