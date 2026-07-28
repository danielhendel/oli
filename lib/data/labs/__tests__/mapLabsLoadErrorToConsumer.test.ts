import { describe, expect, it } from "@jest/globals";
import {
  LABS_CONSUMER_ERROR,
  consumerLabsErrorLeaksInternalDetails,
  mapLabsLoadErrorToConsumer,
} from "../mapLabsLoadErrorToConsumer";

describe("mapLabsLoadErrorToConsumer", () => {
  it("returns stable human copy regardless of internal HTTP details", () => {
    const mapped = mapLabsLoadErrorToConsumer({
      error: "HTTP 500",
      requestId: "abc-123-secret",
      statusCode: 500,
    });
    expect(mapped).toEqual({
      title: "Unable to load labs",
      message: "Your lab reports could not be loaded right now.",
      retryLabel: "Try again",
    });
    expect(mapped.title).toBe(LABS_CONSUMER_ERROR.title);
  });

  it("never echoes raw backend or transport strings", () => {
    const mapped = mapLabsLoadErrorToConsumer({
      error: "HTTP 500: INTERNAL_CONTRACT_MISMATCH",
      requestId: "rid-999",
    });
    const blob = `${mapped.title}\n${mapped.message}\n${mapped.retryLabel}`;
    expect(consumerLabsErrorLeaksInternalDetails(blob)).toBe(false);
    expect(blob).not.toContain("500");
    expect(blob).not.toContain("rid-999");
    expect(blob).not.toContain("INTERNAL");
  });

  it("detects leaked internal details for privacy regressions", () => {
    expect(consumerLabsErrorLeaksInternalDetails("HTTP 500")).toBe(true);
    expect(consumerLabsErrorLeaksInternalDetails("Request ID: abc")).toBe(true);
    expect(consumerLabsErrorLeaksInternalDetails("/users/me/labs/summary")).toBe(true);
    expect(consumerLabsErrorLeaksInternalDetails(LABS_CONSUMER_ERROR.message)).toBe(false);
  });
});
