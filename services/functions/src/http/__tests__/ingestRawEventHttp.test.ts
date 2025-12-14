// services/functions/src/http/__tests__/ingestRawEventHttp.test.ts

import { describe, it, expect, beforeEach, beforeAll, afterAll, jest } from '@jest/globals';
import { ingestRawEventHttp } from '../ingestRawEventHttp';
import type { CanonicalEventKind } from '../../types/health';

// Mock the ingestion primitive so we don't hit Firestore here.
import { ingestRawEvent } from '../../ingestion/rawEvents';

jest.mock('../../ingestion/rawEvents', () => ({
  ingestRawEvent: jest.fn(),
}));

const mockedIngestRawEvent = ingestRawEvent as jest.MockedFunction<typeof ingestRawEvent>;

type CanonicalKindForTest = CanonicalEventKind;

// Lightweight request/response shapes for testing
interface AuthedRequestLike {
  method: string;
  body?: unknown;
  auth?: {
    uid: string;
  };
}

interface ResponseLike {
  status: (code: number) => ResponseLike;
  json: (body: unknown) => ResponseLike | void;
}

interface MockRes {
  res: ResponseLike;
  getStatusCode: () => number | null;
  getJsonBody: () => unknown;
}

/**
 * Helper to create mock req/res objects compatible with our handler.
 */
function createMockReqRes(
  body?: unknown,
  authUid?: string,
): { req: AuthedRequestLike; mockRes: MockRes } {
  const req: AuthedRequestLike = {
    method: 'POST',
    body,
  };

  if (authUid) {
    req.auth = { uid: authUid };
  }

  let statusCode: number | null = null;
  let jsonBody: unknown;

  const res: ResponseLike = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json(body: unknown) {
      jsonBody = body;
      return this;
    },
  };

  const mockRes: MockRes = {
    res,
    getStatusCode: () => statusCode,
    getJsonBody: () => jsonBody,
  };

  return { req, mockRes };
}

describe('ingestRawEventHttp', () => {
  // Keep test output clean: handler logs errors for expected 400 paths.
  const originalConsoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    mockedIngestRawEvent.mockClear();
  });

  it('returns 400 and error when user is unauthenticated', async () => {
    const { req, mockRes } = createMockReqRes({
      sourceId: 'src-1',
      sourceType: 'manual',
      provider: 'mobile_app',
      kind: 'workout' as CanonicalKindForTest,
      observedAt: '2025-01-01T00:00:00.000Z',
      payload: {},
    });

    await (ingestRawEventHttp as unknown as (r: AuthedRequestLike, s: ResponseLike) => Promise<void>)(
      req,
      mockRes.res,
    );

    expect(mockRes.getStatusCode()).toBe(400);

    const body = mockRes.getJsonBody();
    expect(body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.stringContaining('User must be authenticated'),
      }),
    );

    expect(mockedIngestRawEvent).not.toHaveBeenCalled();
  });

  it('returns 400 for unsupported event kind', async () => {
    const { req, mockRes } = createMockReqRes(
      {
        sourceId: 'src-1',
        sourceType: 'manual',
        provider: 'mobile_app',
        kind: 'invalid_kind',
        observedAt: '2025-01-01T00:00:00.000Z',
        payload: {},
      },
      'user-123',
    );

    await (ingestRawEventHttp as unknown as (r: AuthedRequestLike, s: ResponseLike) => Promise<void>)(
      req,
      mockRes.res,
    );

    expect(mockRes.getStatusCode()).toBe(400);

    const body = mockRes.getJsonBody();
    expect(body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.stringContaining('Unsupported kind'),
      }),
    );

    expect(mockedIngestRawEvent).not.toHaveBeenCalled();
  });

  it('calls ingestRawEvent and returns ok on valid input', async () => {
    const validKind: CanonicalKindForTest = 'workout';

    const { req, mockRes } = createMockReqRes(
      {
        sourceId: 'src-1',
        sourceType: 'manual',
        provider: 'mobile_app',
        kind: validKind,
        observedAt: '2025-01-01T00:00:00.000Z',
        payload: { durationMinutes: 45 },
      },
      'user-123',
    );

    mockedIngestRawEvent.mockResolvedValue({
      id: 'raw-evt-1',
      userId: 'user-123',
      sourceId: 'src-1',
      sourceType: 'manual',
      provider: 'mobile_app',
      kind: validKind,
      observedAt: '2025-01-01T00:00:00.000Z',
      receivedAt: '2025-01-01T00:00:10.000Z',
      payload: { durationMinutes: 45 },
      schemaVersion: 1,
    });

    await (ingestRawEventHttp as unknown as (r: AuthedRequestLike, s: ResponseLike) => Promise<void>)(
      req,
      mockRes.res,
    );

    expect(mockedIngestRawEvent).toHaveBeenCalledTimes(1);
    expect(mockedIngestRawEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-123',
        sourceId: 'src-1',
        kind: validKind,
      }),
    );

    expect(mockRes.getStatusCode()).toBe(200);

    const body = mockRes.getJsonBody();
    expect(body).toEqual(
      expect.objectContaining({
        ok: true,
        rawEvent: expect.objectContaining({
          id: 'raw-evt-1',
          userId: 'user-123',
          kind: validKind,
        }),
      }),
    );
  });
});
