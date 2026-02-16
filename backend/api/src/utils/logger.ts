import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: null, // must be object or null when exactOptionalPropertyTypes is true
  redact: {
    paths: ['req.headers.authorization'],
    remove: true
  }
});
