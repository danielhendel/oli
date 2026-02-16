// services/functions/src/http/__tests__/ingestRawEventHttp.test.ts
import { describe, it, expect, jest } from "@jest/globals";
import { ingestRawEventHttp } from "../ingestRawEventHttp";
const createResponseLike = () => {
    const res = {
        status: jest.fn(),
        json: jest.fn(),
    };
    // chain: res.status(...).json(...)
    res.status.mockReturnValue(res);
    return res;
};
describe("ingestRawEventHttp (deprecated)", () => {
    it("returns 410 Gone to enforce single ingestion front door", async () => {
        const req = {};
        const resLike = createResponseLike();
        // Cast only at the boundary; we do not pretend to fully implement Express Response.
        await ingestRawEventHttp(req, resLike);
        expect(resLike.status).toHaveBeenCalledWith(410);
        const expected = { error: "Deprecated endpoint" };
        expect(resLike.json).toHaveBeenCalledWith(expect.objectContaining(expected));
    });
});
