/**
 * setRefreshToken must add a version and destroy older enabled versions.
 * destroyOldSecretVersions must be idempotent and keep-only-safe.
 */

const mockCreateSecret = jest.fn();
const mockAddSecretVersion = jest.fn();
const mockListSecretVersionsAsync = jest.fn();
const mockDestroySecretVersion = jest.fn();

jest.mock("@google-cloud/secret-manager", () => ({
  SecretManagerServiceClient: jest.fn().mockImplementation(() => ({
    createSecret: mockCreateSecret,
    addSecretVersion: mockAddSecretVersion,
    listSecretVersionsAsync: mockListSecretVersionsAsync,
    destroySecretVersion: mockDestroySecretVersion,
  })),
}));

jest.mock("google-auth-library", () => ({
  GoogleAuth: jest.fn().mockImplementation(() => ({
    getProjectId: jest.fn().mockResolvedValue("oli-staging-fdbba"),
  })),
}));

const {
  setRefreshToken,
  destroyOldSecretVersions,
  listEnabledSecretVersions,
} = require("../ouraSecrets") as {
  setRefreshToken: (uid: string, value: string) => Promise<void>;
  destroyOldSecretVersions: (
    projectId: string,
    secretId: string,
    keepVersionNames: ReadonlySet<string>,
  ) => Promise<{ destroyed: number; errorsIgnored: number }>;
  listEnabledSecretVersions: (projectId: string, secretId: string) => Promise<
    { name: string; state: string | null }[]
  >;
};

const PROJECT_ID = "oli-staging-fdbba";
const SECRET_ID = "oura-refresh-token-user_test";
const PARENT = `projects/${PROJECT_ID}/secrets/${SECRET_ID}`;

function enabledVersions(names: string[]): AsyncIterable<{ name: string; state: string }> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const name of names) {
        yield { name, state: "ENABLED" };
      }
    },
  };
}

describe("setRefreshToken", () => {
  const originalProject = process.env.GOOGLE_CLOUD_PROJECT;

  beforeAll(() => {
    process.env.GOOGLE_CLOUD_PROJECT = PROJECT_ID;
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
    mockCreateSecret.mockResolvedValue([{}]);
    mockDestroySecretVersion.mockResolvedValue([{}]);
  });

  it("adds a new version and destroys older enabled versions", async () => {
    const newVersionName = `${PARENT}/versions/99`;
    mockAddSecretVersion.mockResolvedValueOnce([{ name: newVersionName }]);
    mockListSecretVersionsAsync.mockReturnValueOnce(
      enabledVersions([
        `${PARENT}/versions/97`,
        `${PARENT}/versions/98`,
        newVersionName,
      ]),
    );

    await setRefreshToken("user_test", "rt_new_value");

    expect(mockAddSecretVersion).toHaveBeenCalledTimes(1);
    expect(mockDestroySecretVersion).toHaveBeenCalledTimes(2);
    expect(mockDestroySecretVersion).toHaveBeenCalledWith({
      name: `${PARENT}/versions/97`,
    });
    expect(mockDestroySecretVersion).toHaveBeenCalledWith({
      name: `${PARENT}/versions/98`,
    });
    expect(mockDestroySecretVersion).not.toHaveBeenCalledWith({
      name: newVersionName,
    });
  });

  it("throws when addSecretVersion returns no version name", async () => {
    mockAddSecretVersion.mockResolvedValueOnce([{}]);
    await expect(setRefreshToken("user_test", "rt_new_value")).rejects.toThrow(
      "addSecretVersion returned no version name",
    );
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("persists the new version even when cleanup partially fails", async () => {
    const newVersionName = `${PARENT}/versions/5`;
    mockAddSecretVersion.mockResolvedValueOnce([{ name: newVersionName }]);
    mockListSecretVersionsAsync.mockReturnValueOnce(
      enabledVersions([`${PARENT}/versions/3`, `${PARENT}/versions/4`, newVersionName]),
    );
    mockDestroySecretVersion
      .mockResolvedValueOnce([{}])
      .mockRejectedValueOnce(new Error("permission denied"));

    await expect(setRefreshToken("user_test", "rt_new_value")).resolves.toBeUndefined();
    expect(mockAddSecretVersion).toHaveBeenCalledTimes(1);
    expect(mockDestroySecretVersion).toHaveBeenCalledTimes(2);
  });
});

describe("destroyOldSecretVersions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDestroySecretVersion.mockResolvedValue([{}]);
  });

  it("no-ops safely when secret has no enabled versions", async () => {
    mockListSecretVersionsAsync.mockReturnValueOnce({
      async *[Symbol.asyncIterator]() {
        yield { name: `${PARENT}/versions/1`, state: "DESTROYED" };
      },
    });

    const result = await destroyOldSecretVersions(PROJECT_ID, SECRET_ID, new Set());
    expect(result).toEqual({ destroyed: 0, errorsIgnored: 0 });
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("no-ops safely when secret has a single enabled version in keep set", async () => {
    const only = `${PARENT}/versions/1`;
    mockListSecretVersionsAsync.mockReturnValueOnce(enabledVersions([only]));

    const result = await destroyOldSecretVersions(PROJECT_ID, SECRET_ID, new Set([only]));
    expect(result).toEqual({ destroyed: 0, errorsIgnored: 0 });
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });

  it("never destroys versions in keepVersionNames", async () => {
    const keep = `${PARENT}/versions/10`;
    mockListSecretVersionsAsync.mockReturnValueOnce(
      enabledVersions([`${PARENT}/versions/8`, `${PARENT}/versions/9`, keep]),
    );

    const result = await destroyOldSecretVersions(PROJECT_ID, SECRET_ID, new Set([keep]));
    expect(result.destroyed).toBe(2);
    expect(mockDestroySecretVersion).not.toHaveBeenCalledWith({ name: keep });
  });

  it("ignores already-destroyed and not-found destroy errors", async () => {
    mockListSecretVersionsAsync.mockReturnValueOnce(
      enabledVersions([`${PARENT}/versions/1`, `${PARENT}/versions/2`]),
    );
    mockDestroySecretVersion
      .mockRejectedValueOnce(new Error("9 FAILED_PRECONDITION: already DESTROYED"))
      .mockRejectedValueOnce(new Error("NOT_FOUND"));

    const result = await destroyOldSecretVersions(PROJECT_ID, SECRET_ID, new Set());
    expect(result).toEqual({ destroyed: 0, errorsIgnored: 2 });
  });

  it("returns empty list when secret parent is NOT_FOUND", async () => {
    mockListSecretVersionsAsync.mockImplementation(() => {
      throw new Error("NOT_FOUND: secret missing");
    });

    const enabled = await listEnabledSecretVersions(PROJECT_ID, "missing-secret");
    expect(enabled).toEqual([]);

    const result = await destroyOldSecretVersions(PROJECT_ID, "missing-secret", new Set());
    expect(result).toEqual({ destroyed: 0, errorsIgnored: 0 });
    expect(mockDestroySecretVersion).not.toHaveBeenCalled();
  });
});
