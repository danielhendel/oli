import express, { Request, Response, NextFunction } from "express";
import cors from "cors";

import firebaseRoutes from "./routes/firebase";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/healthz", (_req: Request, res: Response) => {
  res.status(200).json({ ok: true });
});

app.use("/firebase", firebaseRoutes);

// Global error handler (typed, safe)
app.use(
  (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal Server Error" });
  }
);

export default app;
