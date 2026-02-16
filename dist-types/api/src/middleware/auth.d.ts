import type { NextFunction, Request, Response } from "express";
export type AuthedRequest = Request & {
    uid?: string;
};
export declare function authMiddleware(req: AuthedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.d.ts.map