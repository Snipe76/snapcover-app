/**
 * Server-Side Instrumentation
 * Runs in Node.js and Edge runtimes for server components, API routes, and server actions.
 *
 * Sets up:
 * - Sentry tracing for all server-side operations
 * - Global error handlers
 * - Database query tracing
 */

import * as Sentry from "@sentry/nextjs";

// Import configs to initialize Sentry
async function initServer() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

initServer().catch(console.error);

export async function register() {
  // Server-side registration happens in initServer()
}

// Capture unhandled errors from server-side async operations
export const onRequestError = Sentry.captureRequestError;

// Export Sentry for direct use in server code
export { Sentry };
