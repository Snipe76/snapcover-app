// Sentry Edge Configuration
// Handles errors from Next.js middleware and Edge routes
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ee4010a7add3c66b7a212d3321a4cdd9@o4511107182100480.ingest.us.sentry.io/4511107184394240",

  // Enable tracing
  tracesSampleRate: 1.0,

  // Enable logs
  enableLogs: true,

  // Attach stack traces
  attachStacktrace: true,

  // Send PII
  sendDefaultPii: true,

  // Environment
  environment: process.env.NODE_ENV ?? 'development',

  // Custom tags
  initialScope: {
    tags: {
      app: 'snapcover',
      runtime: 'edge',
    },
  },

  // BeforeSend hook
  beforeSend(event, hint) {
    if (process.env.NODE_ENV === 'development') {
      const error = hint?.originalException;
      console.error(`[SnapCover][Sentry][Edge] Error captured:`, {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
      });
    }
    return event;
  },
});

export { Sentry };
