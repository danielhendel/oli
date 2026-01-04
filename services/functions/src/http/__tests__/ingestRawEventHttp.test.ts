// services/functions/src/http/__tests__/ingestRawEventHttp.test.ts

import { describe, it, expect, jest } from "@jest/globals";
import type { Request, Response } from "express";
import { ingestRawEventHttp } from "../ingestRawEventHttp";

type JsonBody = Record<string, unknown>;

type ResponseLike = {
  status: jest.Mock;
  json: jest.Mock;
};

const createResponseLike = (): ResponseLike => {
  const res: ResponseLike = {
    status: jest.fn(),
    json: jest.fn(),
  };

  // chain: res.status(...).json(...)
  res.status.mockReturnValue(res);

  return res;
};

describe("ingestRawEventHttp (deprecated)", () => {
  it("returns 410 Gone to enforce single ingestion front door", async () => {
    const req = {} as Request;

    const resLike = createResponseLike();

    // Cast only at the boundary; we do not pretend to fully implement Express Response.
    await ingestRawEventHttp(req, resLike as unknown as Response);

    expect(resLike.status).toHaveBeenCalledWith(410);

    const expected: JsonBody = { error: "Deprecated endpoint" };
    expect(resLike.json).toHaveBeenCalledWith(expect.objectContaining(expected));
  });
});
