// __tests__/users.provision.test.ts
import { ensureUserProvisioned } from "@/lib/users/provision";

jest.mock("@react-native-firebase/firestore", () => {
  const setMock = jest.fn();
  const getMock = jest.fn();
  const docMock = jest.fn(() => ({ get: getMock, set: setMock }));
  const collectionMock = jest.fn(() => ({ doc: docMock }));

  const serverTimestamp = () => ({ __ts: "server" });

  const firestore = () =>
    ({
      collection: collectionMock,
      doc: docMock, // support direct doc(path) style if used elsewhere
      FieldValue: { serverTimestamp },
    } as any);

  // also mirror FieldValue on the function (RNFB sometimes accessed this way)
  (firestore as any).FieldValue = { serverTimestamp };

  return {
    __esModule: true,
    default: firestore,
    FirebaseFirestoreTypes: {}, // shape not needed for this test
  };
});

const fs = require("@react-native-firebase/firestore").default;

describe("ensureUserProvisioned", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates user doc when missing", async () => {
    const get = fs().collection().doc().get as jest.Mock;
    const set = fs().collection().doc().set as jest.Mock;

    get.mockResolvedValueOnce({ exists: false });

    await ensureUserProvisioned("uid_123", {
      email: "a@b.com",
      displayName: "A B",
    });

    expect(set).toHaveBeenCalledTimes(1);
    const [payload, opts] = set.mock.calls[0];
    expect(payload.email).toBe("a@b.com");
    expect(payload.displayName).toBe("A B");
    expect(payload.profileVersion).toBe(1);
    expect(payload.onboarding.status).toBe("empty");
    expect(payload.createdAt).toEqual({ __ts: "server" });
    expect(payload.updatedAt).toEqual({ __ts: "server" });
    expect(opts).toEqual({ merge: false });
  });

  it("touches updatedAt when doc exists", async () => {
    const get = fs().collection().doc().get as jest.Mock;
    const set = fs().collection().doc().set as jest.Mock;

    get.mockResolvedValueOnce({ exists: true });

    await ensureUserProvisioned("uid_123");

    expect(set).toHaveBeenCalledTimes(1);
    const [payload, opts] = set.mock.calls[0];
    expect(payload).toEqual({ updatedAt: { __ts: "server" } });
    expect(opts).toEqual({ merge: true });
  });
});
