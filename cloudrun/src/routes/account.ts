// cloudrun/src/routes/account.ts
import { Router } from "express";
import { withReq } from "../logging.js";
import { requireFirebaseUser } from "../middleware/auth.js";
import { deleteUserData } from "../account/delete.js";

const router = Router();

/** GET /account/export — stub for now */
router.get("/export", async (req, res) => {
  const log = withReq(req);
  log.info("account.export");
  return res.json({ version: 1, items: [] });
});

/** POST /account/delete — protected; logs then delegates to handler */
router.post("/delete", requireFirebaseUser, async (req, res) => {
  const log = withReq(req);
  log.info("account.delete.requested", { path: "/account/delete" });
  return deleteUserData(req, res);
});

export default router;
