import type { Request, Response, NextFunction } from "express";
type LogPayload = Record<string, unknown>;
export declare const logger: {
    info: (o: LogPayload) => void;
    error: (o: LogPayload) => void;
};
export declare function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void;
export {};
//# sourceMappingURL=logger.d.ts.map