import express, { json } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requireAuth } from './middleware/auth.js';
import { requireIdempotencyKey } from './middleware/idempotency.js';
import { errorHandler } from './middleware/errorHandler.js';
import { perUserRateLimit } from './middleware/rateLimit.js';
import { healthz } from './routes/healthz.js';
import { ingest } from './routes/events.js';
import { requestExport } from './routes/export.js';
import { requestAccountDelete } from './routes/accountDelete.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: true }));
app.use(json({ limit: '1mb' }));

app.get('/healthz', healthz);

// Authenticated routes
app.post('/events/ingest', requireAuth, perUserRateLimit, requireIdempotencyKey, ingest);
app.post('/export', requireAuth, perUserRateLimit, requireIdempotencyKey, requestExport);
app.post('/account/delete', requireAuth, perUserRateLimit, requireIdempotencyKey, requestAccountDelete);

app.use(errorHandler);

const port = Number(process.env.PORT ?? 8080);
app.listen(port, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`api listening on :${port}`);
});
