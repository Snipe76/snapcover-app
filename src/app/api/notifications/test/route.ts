import { NextRequest, NextResponse } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { timeApiRoute, captureError } from '@/lib/logger';

export async function POST(req: NextRequest) {
  return timeApiRoute('POST', '/api/notifications/test', req, async () => {
    // Dynamic import keeps web-push out of the Edge bundle
    let webpush: typeof import('web-push');
    try {
      webpush = await import('web-push');
    } catch (importErr) {
      captureError('API', 'Failed to import web-push', importErr);
      return NextResponse.json({ error: 'Push module unavailable' }, { status: 500 });
    }

    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
    const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:admin@snapcover.app';
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      Sentry.addBreadcrumb({
        message: 'Push not configured - VAPID keys missing',
        level: 'warning',
      });
      return NextResponse.json({ error: 'Push not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    let body: { subscription?: unknown };
    try {
      body = await req.json();
    } catch (parseErr) {
      captureError('API', 'Invalid JSON in test notification', parseErr);
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { subscription } = body;

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription' }, { status: 400 });
    }

    try {
      await webpush.sendNotification(
        subscription as Parameters<typeof webpush.sendNotification>[0],
        JSON.stringify({
          title: 'SnapCover',
          body: 'Test notification — your push is working!',
          icon: '/icon.png',
          badge: '/icon.png',
          tag: 'test',
        })
      );

      Sentry.addBreadcrumb({
        message: 'Test push notification sent',
        data: { endpoint: ((subscription as { endpoint?: string })?.endpoint ?? '').slice(0, 30) },
        level: 'info',
      });

      return NextResponse.json({ success: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      captureError('API', 'webpush.sendNotification failed', err, {
        endpoint: (subscription as { endpoint?: string })?.endpoint,
      });
      Sentry.addBreadcrumb({
        message: `Push send failed: ${message}`,
        data: { error: message },
        level: 'error',
      });
      return NextResponse.json({ error: message }, { status: 500 });
    }
  });
}
