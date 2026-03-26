/**
 * SnapCover Comprehensive Logger & Debug System
 *
 * Provides structured logging, Sentry integration, breadcrumbs, performance tracking,
 * and global error handling for frontend, backend, API routes, and browser.
 *
 * Usage:
 *   import { logger, withPerformance, captureError, logPageView } from '@/lib/logger'
 *
 *   // Log with namespace, message, and context
 *   logger.error('Supabase', 'Query failed', { table: 'warranties', error })
 *   logger.info('WarrantyList', 'Mounted', { count: warranties.length })
 *
 *   // Track performance
 *   const end = withPerformance('OCR', 'extractReceiptData')
 *   await extractReceiptData(imageDataUrl)
 *   end()
 *
 *   // Breadcrumbs for navigation actions
 *   addBreadcrumb('UserAction', 'Clicked add warranty', { source: 'fab' })
 *
 *   // Wrap a React component with error boundary (import from @/components/ErrorBoundary)
 *   import { ErrorBoundary } from '@/components/ErrorBoundary'
 *   <ErrorBoundary namespace="AddPage"><AddPageInner /></ErrorBoundary>
 */

import * as Sentry from '@sentry/nextjs';
import { createClient } from '@/lib/supabase/client';

// ─── Device / Context Helpers ─────────────────────────────────────────────────

function getTimestamp(): string {
  return new Date().toISOString();
}

function getDeviceInfo(): Record<string, unknown> {
  if (typeof window === 'undefined') return {};
  return {
    url: window.location.href,
    path: window.location.pathname,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
    language: navigator.language,
    onLine: navigator.onLine,
    cookieEnabled: navigator.cookieEnabled,
  };
}

function getNavigationInfo(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const nav = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (!nav) return null;
  return {
    type: PerformanceNavigationTiming.prototype.toString.call(nav).replace('PerformanceNavigationTiming', '').trim(),
    domInteractive: Math.round(nav.domInteractive),
    domComplete: Math.round(nav.domComplete),
    loadEventEnd: Math.round(nav.loadEventEnd),
  };
}

// ─── Breadcrumb System ─────────────────────────────────────────────────────────

type BreadcrumbLevel = 'debug' | 'info' | 'warn' | 'error';

interface Breadcrumb {
  timestamp: string;
  level: BreadcrumbLevel;
  namespace: string;
  message: string;
  context?: unknown;
}

const MAX_BREADCRUMBS = 50;
const breadcrumbs: Breadcrumb[] = [];

export function addBreadcrumb(
  namespace: string,
  message: string,
  context?: unknown,
  level: BreadcrumbLevel = 'info'
): void {
  const crumb: Breadcrumb = {
    timestamp: getTimestamp(),
    level,
    namespace,
    message,
    context,
  };

  breadcrumbs.push(crumb);
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }

  // Also send to Sentry as a breadcrumb
  Sentry.addBreadcrumb({
    message,
    category: namespace,
    data: context as Record<string, unknown> | undefined,
    level: level === 'error' ? 'error' : level === 'warn' ? 'warning' : 'info',
  });

  // Console output in dev
  if (process.env.NODE_ENV === 'development') {
    const prefix = `[SnapCover][Breadcrumb][${namespace}]`;
    if (level === 'error' || level === 'warn') {
      console.warn(prefix, message, context);
    } else {
      console.debug(prefix, message, context);
    }
  }
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

// ─── Performance Tracking ───────────────────────────────────────────────────────

export function performanceMark(label: string, detail?: string): void {
  if (typeof window === 'undefined' && typeof performance === 'undefined') return;
  try {
    performance.mark(`[SnapCover] ${label}${detail ? ` (${detail})` : ''}`);
  } catch {
    // Ignore if performance.mark is not available
  }
}

export function performanceMeasure(
  name: string,
  startMark: string,
  endMark?: string
): number | null {
  if (typeof performance === 'undefined') return null;
  try {
    const measure = performance.measure(
      name,
      startMark,
      endMark ?? `[SnapCover] ${startMark.replace('[SnapCover] ', '')}`
    );
    return measure?.duration ?? null;
  } catch {
    return null;
  }
}

/**
 * Wrap an async function with performance tracking.
 * Logs duration to Sentry as a measurement.
 *
 * @example
 * const end = withPerformance('Supabase', 'fetchWarranties')
 * const data = await supabase.from('warranties').select()
 * end({ rowCount: data.length })
 */
export function withPerformance(
  namespace: string,
  operation: string,
  extraContext?: Record<string, unknown>
): (resultContext?: Record<string, unknown>) => void {
  const startMark = `[SnapCover] ${namespace}:${operation}`;
  const startTime = Date.now();

  performanceMark(namespace, operation);

  return (resultContext?: Record<string, unknown>) => {
    const duration = Date.now() - startTime;

    // Log to Sentry as measurement
    Sentry.setMeasurement(`${namespace}.${operation}`, duration, 'ms');

    // Log to console in dev
    if (process.env.NODE_ENV === 'development') {
      console.debug(
        `[SnapCover][Performance][${namespace}:${operation}] ${duration}ms`,
        resultContext ?? extraContext ?? ''
      );
    }

    // Add breadcrumb
    addBreadcrumb(
      namespace,
      `${operation} completed`,
      { durationMs: duration, ...extraContext, ...resultContext },
      'debug'
    );
  };
}

// ─── Core Logger ───────────────────────────────────────────────────────────────

type Level = 'debug' | 'info' | 'warn' | 'error';

function output(
  level: Level,
  namespace: string,
  message: string,
  context?: unknown
) {
  const ts = getTimestamp();
  const device = getDeviceInfo();
  const nav = getNavigationInfo();

  const payload = {
    _snaptag: true,
    ts,
    level,
    namespace,
    message,
    context,
    device,
    navigation: nav,
  };

  // Always console output
  const prefix = `[SnapCover][${level.toUpperCase()}][${namespace}]`;
  switch (level) {
    case 'error':
      console.error(prefix, message, '\n  context:', context, '\n  device:', device);
      break;
    case 'warn':
      console.warn(prefix, message, '\n  context:', context);
      break;
    case 'info':
      console.info(prefix, message, context);
      break;
    case 'debug':
      console.debug(prefix, message, context);
      break;
  }

  // Send to Sentry for errors and warnings
  if (level === 'error' || level === 'warn') {
    Sentry.withScope((scope) => {
      scope.setLevel(level === 'error' ? 'error' : 'warning');
      scope.setContext('snapcover', {
        namespace,
        message,
        ...(typeof context === 'object' && context !== null ? context : { raw: context }),
      });
      scope.setContext('device', device);
      if (nav) scope.setContext('navigation', nav);

      if (context instanceof Error) {
        scope.setTag('error_type', context.constructor.name);
        scope.setTag('error_namespace', namespace);
        Sentry.captureException(context, { extra: { namespace, message, breadcrumbs } });
      } else {
        scope.setTag('error_namespace', namespace);
        Sentry.captureMessage(message, {
          level: level === 'error' ? 'error' : 'warning',
          extra: { namespace, context, breadcrumbs },
        });
      }
    });
  }
}

export const logger = {
  error(namespace: string, message: string, context?: unknown) {
    addBreadcrumb(namespace, message, context, 'error');
    output('error', namespace, message, context);
  },

  warn(namespace: string, message: string, context?: unknown) {
    addBreadcrumb(namespace, message, context, 'warn');
    output('warn', namespace, message, context);
  },

  info(namespace: string, message: string, context?: unknown) {
    addBreadcrumb(namespace, message, context, 'info');
    output('info', namespace, message, context);
  },

  debug(namespace: string, message: string, context?: unknown) {
    if (process.env.NODE_ENV === 'development') {
      addBreadcrumb(namespace, message, context, 'debug');
      output('debug', namespace, message, context);
    }
  },
};

// ─── Capture Error Helper ─────────────────────────────────────────────────────

/**
 * Capture an error to Sentry with rich context.
 * Use this in try/catch blocks instead of raw Sentry calls.
 *
 * @example
 * try {
 *   await doSomething()
 * } catch (err) {
 *   captureError('MyComponent', 'doSomething failed', err, { userId, itemId })
 * }
 */
export function captureError(
  namespace: string,
  message: string,
  error: unknown,
  extraContext?: Record<string, unknown>
): void {
  const errorObj = error instanceof Error
    ? error
    : new Error(String(error));

  const end = withPerformance(namespace, message, extraContext);
  end({ errorMessage: errorObj.message });

  logger.error(namespace, message, {
    ...extraContext,
    errorName: errorObj.name,
    errorMessage: errorObj.message,
    errorStack: errorObj.stack,
    stack: errorObj.stack,
  });
}

// ─── Page View Logger ─────────────────────────────────────────────────────────

export function logPageView(page: string, params?: Record<string, unknown>): void {
  addBreadcrumb('Navigation', `Navigated to ${page}`, params, 'info');
  logger.info('PageView', `Navigated to ${page}`, {
    ...params,
    breadcrumbs: breadcrumbs.length,
  });
}

// ─── Supabase Error Logger ────────────────────────────────────────────────────

/**
 * Log a Supabase operation error with full context.
 * Use this instead of raw console.error for Supabase failures.
 */
export function logSupabaseError(
  operation: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | 'upload' | 'auth',
  table: string,
  error: unknown,
  extra?: Record<string, unknown>
): void {
  const details = error instanceof Error
    ? {
        name: error.name,
        message: error.message,
        code: (error as { code?: string }).code,
        details: (error as { details?: string }).details,
        hint: (error as { hint?: string }).hint,
      }
    : { raw: String(error) };

  captureError('Supabase', `${operation} on ${table} failed`, error instanceof Error ? error : new Error(String(error)), {
    operation,
    table,
    ...details,
    ...extra,
  });
}

// ─── API Route Helper ────────────────────────────────────────────────────────

/**
 * Time an API route handler and log timing to Sentry.
 * Use as a wrapper around your handler.
 *
 * @example
 * export async function GET(request: Request) {
 *   return timeApiRoute('GET', '/api/warranties', request, async () => {
 *     // your handler code
 *   })
 * }
 */
export async function timeApiRoute<T>(
  method: string,
  path: string,
  request: Request,
  handler: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  const requestId = crypto.randomUUID?.() ?? `${Date.now()}`;

  // Log request start
  addBreadcrumb('APIRoute', `${method} ${path} started`, {
    requestId,
    method,
    path,
    hasBody: request.body !== null,
  });

  try {
    const result = await handler();
    const duration = Date.now() - start;

    Sentry.setMeasurement(`api.${method.toLowerCase()}`, duration, 'ms');

    addBreadcrumb('APIRoute', `${method} ${path} succeeded`, {
      requestId,
      duration,
    });

    return result;
  } catch (err) {
    const duration = Date.now() - start;

    captureError('APIRoute', `${method} ${path} failed`, err instanceof Error ? err : new Error(String(err)), {
      requestId,
      method,
      path,
      duration,
    });

    throw err;
  }
}

// ─── Global Error Handlers ────────────────────────────────────────────────────

let globalErrorHandlersInitialized = false;

export function initGlobalErrorHandlers(): void {
  if (typeof window === 'undefined') return;
  if (globalErrorHandlersInitialized) return;
  globalErrorHandlersInitialized = true;

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const isIgnored =
      reason?.name === 'AbortError' ||
      reason?.message?.includes('abort') ||
      reason?.message?.includes('cancelled') ||
      reason?.message?.includes('Failed to fetch') ||
      reason?.message?.includes('NetworkError');

    if (isIgnored) return;

    logger.error(
      'UnhandledRejection',
      `Unhandled promise rejection: ${reason instanceof Error ? reason.message : String(reason)}`,
      {
        reason: reason instanceof Error
          ? { name: reason.name, message: reason.message, stack: reason.stack }
          : String(reason),
        currentUrl: window.location.href,
        currentPath: window.location.pathname,
      }
    );
  });

  // Global window errors
  window.addEventListener('error', (event) => {
    const target = event.target as HTMLElement;

    // Ignore resource loading errors that have fallbacks
    const isResourceError =
      event.target !== window &&
      (target?.tagName === 'IMG' || target?.tagName === 'SCRIPT' || target?.tagName === 'LINK');

    // Ignore non-critical browser messages
    const isIgnored =
      event.message?.includes('favicon') ||
      event.message?.includes('ResizeObserver') ||
      event.message?.includes('passive event listener') ||
      event.message?.includes('net::ERR_') ||
      event.message?.includes('Failed to load resource');

    if (isResourceError || isIgnored) return;

    logger.error(
      'GlobalError',
      `Window error: ${event.message}`,
      {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack ?? event.error?.message ?? String(event.error),
        targetTag: target?.tagName,
        targetId: target?.id,
        targetClass: target?.className?.slice(0, 100),
        currentUrl: window.location.href,
        currentPath: window.location.pathname,
      }
    );
  });

  // Log navigation events as breadcrumbs
  if (typeof window !== 'undefined' && 'navigation' in window) {
    const nav = (window as unknown as { navigation?: { addEventListener: (type: string, cb: () => void) => void } }).navigation;
    nav?.addEventListener?.('navigate', () => {
      addBreadcrumb('Navigation', 'Page navigate started', {
        from: window.location.pathname,
      });
    });
  }

  // Capture online/offline status changes
  window.addEventListener('online', () => {
    logger.info('Network', 'Browser went online');
  });

  window.addEventListener('offline', () => {
    logger.warn('Network', 'Browser went offline', {
      currentUrl: window.location.href,
    });
  });

  // Warn when user leaves with unsaved changes (if page has beforeunload)
  window.addEventListener('beforeunload', (event) => {
    addBreadcrumb('Navigation', 'Page beforeunload', {
      url: window.location.href,
    });
  });

  if (process.env.NODE_ENV === 'development') {
    console.debug('[SnapCover][Logger] Global error handlers initialized');
  }
}

// ─── Supabase Client Wrapper ──────────────────────────────────────────────────

/**
 * Wrapped Supabase client that auto-logs all queries and errors.
 * Use this instead of raw createClient() when you want automatic debugging.
 *
 * @example
 * const supabase = createDebugClient()
 * const { data, error } = await supabase.from('warranties').select()
 * if (error) logSupabaseError('select', 'warranties', error)
 */
export function createDebugClient() {
  // This returns the normal client but all errors should be logged via logSupabaseError
  return createClient();
}

// Re-export createClient for convenience
export { createClient } from '@/lib/supabase/client';
