import { requireFirebaseStorageBucketId } from "../firebaseStorageBucketId";

describe("requireFirebaseStorageBucketId", () => {
  const keys = ["FIREBASE_STORAGE_BUCKET", "GOOGLE_CLOUD_PROJECT", "FIREBASE_PROJECT_ID", "GCLOUD_PROJECT"] as const;

  afterEach(() => {
    for (const k of keys) delete process.env[k];
  });

  it("uses explicit FIREBASE_STORAGE_BUCKET when set", () => {
    process.env.FIREBASE_STORAGE_BUCKET = "  my-explicit-bucket  ";
    process.env.GOOGLE_CLOUD_PROJECT = "should-be-ignored";
    expect(requireFirebaseStorageBucketId()).toBe("my-explicit-bucket");
  });

  it("derives bucket from GOOGLE_CLOUD_PROJECT when explicit unset", () => {
    process.env.GOOGLE_CLOUD_PROJECT = "oli-staging-fdbba";
    expect(requireFirebaseStorageBucketId()).toBe("oli-staging-fdbba.firebasestorage.app");
  });

  it("prefers GOOGLE_CLOUD_PROJECT over FIREBASE_PROJECT_ID", () => {
    process.env.FIREBASE_PROJECT_ID = "proj-a";
    process.env.GOOGLE_CLOUD_PROJECT = "proj-b";
    expect(requireFirebaseStorageBucketId()).toBe("proj-b.firebasestorage.app");
  });

  it("throws when nothing is set", () => {
    expect(() => requireFirebaseStorageBucketId()).toThrow("Missing FIREBASE_STORAGE_BUCKET env var");
  });
});
