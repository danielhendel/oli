import { Router } from "express";
import { publishJSON } from "../lib/pubsub";
import type { AuthedRequest } from "../middleware/auth";

const router = Router();

/** Request a user export (publishes to Pub/Sub) */
router.post("/export", async (req: AuthedRequest, res) => {
  const uid = req.uid!;
  await publishJSON(process.env.TOPIC_EXPORTS!, { uid, at: new Date().toISOString() });
  res.status(202).json({ status: "queued" });
});

/** Request account deletion (publishes to Pub/Sub) */
router.post("/account/delete", async (req: AuthedRequest, res) => {
  const uid = req.uid!;
  await publishJSON(process.env.TOPIC_DELETE!, { uid, at: new Date().toISOString() });
  res.status(202).json({ status: "queued" });
});

export default router;
