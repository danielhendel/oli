/**
 * Deprecated ingestion entrypoint (DO NOT USE).
 *
 * Oli uses a single ingestion front door: Cloud Run API `/ingest/events`.
 * This handler is intentionally disabled to prevent drift and ambiguity.
 */
export const ingestRawEventHttp = async (_req, res) => {
    res.status(410).json({
        error: "Deprecated endpoint",
        message: "This ingestion endpoint has been retired. Use Cloud Run API: POST /ingest/events",
    });
};
