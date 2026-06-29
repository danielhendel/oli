/**
 * deleteRefreshToken must be idempotent when custody was already removed
 * (e.g. performReconnectCleanupBestEffort after token refresh failure).
 */

const mockListSecretVersionsAsync = jest.fn();
const mockDestroySecretVersion = jest.fn();

jest.mock("@google-cloud/secret-manager", () => ({
  SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
    listSecretVersionsAsync: mockListSecretVersionsAsync,
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

function versionsFromList(
  items: { name: string; state: string }[],
): AsyncIterable<{ name: string; state: string }> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    },
  };
}

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
    mockListSecretVersionsAsync.mockImplementationOnce(() => {
      throw new Error("NOT_FOUND: secret missing");
    });
    await expect(deleteRefreshToken("user_test")).resolves.toBeUndefined();
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("skips versions already in DESTROYED state", async () => {
    mockListSecretVersionsAsync.mockReturnValueOnce(
      versionsFromList([{ name: "projects/p/secrets/s/versions/1", state: "DESTROYED" }]),
    );
    await expect(deleteRefreshToken("user_test")).resolves.toBeUndefined();
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("ignores FAILED_PRECONDITION when destroy races an already-destroyed version", async () => {
    mockListSecretVersionsAsync.mockReturnValueOnce(
      versionsFromList([{ name: "projects/p/secrets/s/versions/2", state: "ENABLED" }]),
    );
    mockDestroySecretVersion.mockRejectedValueOnce(
      new Error("9 FAILED_PRECONDITION: SecretVersion.state is already DESTROYED."),
    );
    await expect(deleteRefreshToken("user_test")).resolves.toBeUndefined();
    expect(mockDestroySecretVersion).toHaveBeenCalledTimes(1);
  });

  it("destroys ENABLED versions when present", async () => {
    mockListSecretVersionsAsync.mockReturnValueOnce(
      versionsFromList([
        { name: "projects/p/secrets/s/versions/1", state: "DESTROYED" },
        { name: "projects/p/secrets/s/versions/2", state: "ENABLED" },
      ]),
    );
    await deleteRefreshToken("user_test");
    expect(mockDestroySecretVersion).toHaveBeenCalledTimes(1);
    expect(mockDestroySecretVersion).toHaveBeenCalledWith({
      name: "projects/p/secrets/s/versions/2",
    });
  });
});
