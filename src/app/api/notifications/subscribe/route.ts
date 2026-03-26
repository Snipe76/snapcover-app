import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { timeApiRoute, logSupabaseError } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: Request) {
  return timeApiRoute('POST', '/api/notifications/subscribe', request, async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { subscription?: { endpoint?: string; keys?: unknown }; action?: string };
    try {
      body = await request.json();
    } catch (parseErr) {
      Sentry.captureException(parseErr instanceof Error ? parseErr : new Error(String(parseErr)), {
        extra: { path: '/api/notifications/subscribe', method: 'POST' },
      });
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { subscription, action } = body;

    if (!subscription?.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription: missing endpoint' }, { status: 400 });
    }

    if (action === 'update') {
      // pushsubscriptionchange — update existing subscription
      const { endpoint, keys } = subscription;
      const { error } = await supabase
        .from('push_subscriptions')
        .update({ keys })
        .eq('user_id', user.id)
        .eq('endpoint', endpoint);

      if (error) {
        logSupabaseError('update', 'push_subscriptions', error, { action: 'update', endpoint });
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      Sentry.addBreadcrumb({
        message: 'Push subscription updated',
        data: { userId: user.id, endpoint: endpoint.slice(0, 30) + '...' },
        level: 'info',
      });

      return NextResponse.json({ success: true });
    }

    // New subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      }, {
        onConflict: 'user_id,endpoint',
      });

    if (error) {
      logSupabaseError('upsert', 'push_subscriptions', error, { userId: user.id });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    Sentry.addBreadcrumb({
      message: 'Push subscription created',
      data: { userId: user.id, endpoint: subscription.endpoint.slice(0, 30) + '...' },
      level: 'info',
    });

    return NextResponse.json({ success: true });
  });
}
