import { Router, Request, Response } from "express";

const router = Router();

router.post("/verify", (req: Request, res: Response) => {
  const body: unknown = req.body;

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  // Example placeholder logic — replace with real verification
  return res.status(200).json({ ok: true });
});

export default router;
