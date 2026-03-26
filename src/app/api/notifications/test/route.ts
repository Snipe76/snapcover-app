import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    // Dynamic import keeps web-push out of the Edge bundle
    const webpush = (await import('web-push')).default;

    const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
    const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:admin@snapcover.app';
    const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

    if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
      return NextResponse.json({ error: 'Push not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { subscription } = await req.json();

    if (!subscription) {
      return NextResponse.json({ error: 'No subscription' }, { status: 400 });
    }

    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: 'SnapCover',
        body: 'Test notification — your push is working!',
        icon: '/icon.png',
        badge: '/icon.png',
        tag: 'test',
      })
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[api/notifications/test]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

