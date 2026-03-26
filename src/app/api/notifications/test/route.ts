import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';

const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY ?? '';
const VAPID_EMAIL = process.env.VAPID_EMAIL ?? 'mailto:admin@snapcover.app';

webpush.setVapidDetails(VAPID_EMAIL, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '', VAPID_PRIVATE_KEY);

export async function POST(req: NextRequest) {
  try {
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
