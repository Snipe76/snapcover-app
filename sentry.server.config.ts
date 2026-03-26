// Sentry Server (Node.js) Configuration
// Handles all server-side error capturing, performance tracing for API routes and RSC
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ee4010a7add3c66b7a212d3321a4cdd9@o4511107182100480.ingest.us.sentry.io/4511107184394240",

  // Enable all performance monitoring
  tracesSampleRate: 1.0, // 100% in development, lower in production

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Attach stack traces
  attachStacktrace: true,

  // Send PII (user IDs, emails)
  sendDefaultPii: true,

  // Environment
  environment: process.env.NODE_ENV ?? 'development',

  // Custom tags for all events
  initialScope: {
    tags: {
      app: 'snapcover',
      runtime: 'nodejs',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    },
  },

  // BeforeSend hook
  beforeSend(event, hint) {
    const error = hint?.originalException;

    if (error instanceof Error) {
      // Log certain errors at a higher level but don't filter
      if (process.env.NODE_ENV === 'development') {
        console.error(`[SnapCover][Sentry][Server] Error captured:`, {
          name: error.name,
          message: error.message,
          stack: error.stack,
        });
      }
    }

    // Add server context
    event.contexts = {
      ...event.contexts,
      server: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage?.()?.heapUsed
          ? `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
          : undefined,
      },
    };

    return event;
  },
});

export { Sentry };
