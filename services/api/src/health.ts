import { Router, type Request, type Response } from "express";

const router = Router();

type HealthOk = {
  ok: true;
  service: "oli-api";
  env?: string;
  requestId?: string;
};

const getRid = (req: Request): string | undefined => {
  const rid = req.header("x-request-id")?.trim();
  return rid ? rid : undefined;
};

const handler = (req: Request, res: Response) => {
  const env = process.env.APP_ENV;
  const rid = getRid(req);

  const body: HealthOk = {
    ok: true,
    service: "oli-api",
    ...(env ? { env } : {}),
    ...(rid ? { requestId: rid } : {}),
  };

  res.status(200).json(body);
};

router.get("/", handler);
router.get("/health", handler);
router.get("/healthz", handler);

export default router;
