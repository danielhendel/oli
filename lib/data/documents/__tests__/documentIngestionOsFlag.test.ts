import { afterEach, describe, expect, it } from "@jest/globals";
import {
  DOCUMENT_INGESTION_OS_V1_ENV_KEY,
  isDocumentIngestionOsV1Enabled,
  setDocumentIngestionOsV1EnabledForTests,
} from "../documentIngestionOsFlag";

describe("documentIngestionOsV1 flag", () => {
  afterEach(() => {
    setDocumentIngestionOsV1EnabledForTests(null);
    delete process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY];
  });

  it("defaults to enabled when unset", () => {
    delete process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY];
    setDocumentIngestionOsV1EnabledForTests(null);
    expect(isDocumentIngestionOsV1Enabled()).toBe(true);
  });

  it('enables on "1"', () => {
    process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY] = "1";
    setDocumentIngestionOsV1EnabledForTests(null);
    expect(isDocumentIngestionOsV1Enabled()).toBe(true);
  });

  it('disables on "0"', () => {
    process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY] = "0";
    setDocumentIngestionOsV1EnabledForTests(null);
    expect(isDocumentIngestionOsV1Enabled()).toBe(false);
  });

  it("treats unexpected values as enabled", () => {
    process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY] = "maybe";
    setDocumentIngestionOsV1EnabledForTests(null);
    expect(isDocumentIngestionOsV1Enabled()).toBe(true);
  });

  it("honors test override over env", () => {
    process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY] = "0";
    setDocumentIngestionOsV1EnabledForTests(true);
    expect(isDocumentIngestionOsV1Enabled()).toBe(true);

    setDocumentIngestionOsV1EnabledForTests(false);
    process.env[DOCUMENT_INGESTION_OS_V1_ENV_KEY] = "1";
    expect(isDocumentIngestionOsV1Enabled()).toBe(false);
  });
});
