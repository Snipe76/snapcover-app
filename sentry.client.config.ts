// Sentry Client (Browser) Configuration
// Handles all client-side error capturing, performance tracing, and replays
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://ee4010a7add3c66b7a212d3321a4cdd9@o4511107182100480.ingest.us.sentry.io/4511107184394240",

  // Integrations
  integrations: [
    // Session Replay for debugging user sessions
    Sentry.replayIntegration({
      maskAllText: false, // Don't mask text - we want to see what's happening
      maskAllInputs: false, // Don't mask inputs
      blockAllMedia: false, // Capture media errors
    }),
    // Browser tracing for performance
    Sentry.browserTracingIntegration(),
  ],

  // Sampling rates
  tracesSampleRate: 1.0, // Capture all traces in development
  replaysSessionSampleRate: 0.1, // 10% of sessions in prod
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Attach stack traces to all messages
  attachStacktrace: true,

  // Send PII (for debugging user-specific issues)
  // Only enable if your app doesn't handle sensitive data
  sendDefaultPii: true,

  // Environment
  environment: process.env.NODE_ENV ?? 'development',

  // Custom tags
  initialScope: {
    tags: {
      app: 'snapcover',
      version: process.env.NEXT_PUBLIC_APP_VERSION ?? 'unknown',
    },
  },

  // BeforeSend hook - useful for filtering or modifying events
  beforeSend(event, hint) {
    // Filter out ignored errors
    const error = hint?.originalException;

    if (error instanceof Error) {
      // Ignore specific errors
      if (
        error.message?.includes('favicon') ||
        error.message?.includes('ResizeObserver') ||
        error.message?.includes('passive event listener') ||
        error.name === 'AbortError' ||
        error.message?.includes('abort') ||
        error.message?.includes('cancelled')
      ) {
        return null;
      }
    }

    // Add device info to every event
    if (typeof window !== 'undefined') {
      event.contexts = {
        ...event.contexts,
        device: {
          url: window.location.href,
          path: window.location.pathname,
          user_agent: navigator.userAgent,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
          online: navigator.onLine,
        },
      };

      // Add user info if available
      event.user = {
        ...event.user,
        ip_address: '{{auto}}',
      };
    }

    return event;
  },
});

// Export for manual use
export { Sentry };
