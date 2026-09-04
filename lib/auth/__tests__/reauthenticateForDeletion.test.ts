import { describe, expect, it, jest, beforeEach } from "@jest/globals";

jest.mock("firebase/auth", () => ({
  EmailAuthProvider: { credential: jest.fn((email: string, password: string) => ({ email, password })) },
  reauthenticateWithCredential: jest.fn(),
}));

jest.mock("@/lib/firebaseConfig", () => ({
  getFirebaseAuth: jest.fn(),
}));

import { EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebaseConfig";
import { reauthenticateForAccountDeletion } from "../reauthenticateForDeletion";

describe("reauthenticateForAccountDeletion", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("rejects empty password without calling Firebase", async () => {
    const result = await reauthenticateForAccountDeletion("");
    expect(result.ok).toBe(false);
    expect(reauthenticateWithCredential).not.toHaveBeenCalled();
  });

  it("passes password exactly as entered", async () => {
    (getFirebaseAuth as jest.Mock).mockReturnValue({
      currentUser: {
        email: "member@example.com",
        getIdToken: jest.fn().mockResolvedValue("token"),
      },
    });
    (reauthenticateWithCredential as jest.Mock).mockResolvedValue(undefined);

    const result = await reauthenticateForAccountDeletion(" p@ss  ");
    expect(result.ok).toBe(true);
    expect(EmailAuthProvider.credential).toHaveBeenCalledWith("member@example.com", " p@ss  ");
  });

  it("maps invalid credential safely", async () => {
    (getFirebaseAuth as jest.Mock).mockReturnValue({
      currentUser: { email: "member@example.com", getIdToken: jest.fn() },
    });
    (reauthenticateWithCredential as jest.Mock).mockRejectedValue({ code: "auth/wrong-password" });

    const result = await reauthenticateForAccountDeletion("wrong");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("incorrect");
      expect(result.message).not.toContain("auth/");
    }
  });
});
