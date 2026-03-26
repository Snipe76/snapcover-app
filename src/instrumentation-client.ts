/**
 * Client-Side Instrumentation
 * Runs in the browser for client components and pages.
 *
 * Sets up:
 * - Sentry browser tracing
 * - Global error handlers
 * - Navigation breadcrumbs
 */

import * as Sentry from "@sentry/nextjs";
import { initGlobalErrorHandlers } from "@/lib/logger";

// Import Sentry client config to initialize it
async function initClient() {
  await import("../sentry.client.config");

  // Initialize global error handlers for unhandled errors/promises
  if (typeof window !== "undefined") {
    initGlobalErrorHandlers();
  }
}

initClient().catch(console.error);

export { Sentry };

// Export for router transition tracking
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
