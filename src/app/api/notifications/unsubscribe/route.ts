import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { timeApiRoute, logSupabaseError } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

export async function DELETE(request: Request) {
  return timeApiRoute('DELETE', '/api/notifications/unsubscribe', request, async () => {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body: { endpoint?: string };
    try {
      body = await request.json();
    } catch (parseErr) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      logSupabaseError('delete', 'push_subscriptions', error, { userId: user.id, endpoint });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    Sentry.addBreadcrumb({
      message: 'Push subscription deleted',
      data: { userId: user.id, endpoint: endpoint.slice(0, 30) + '...' },
      level: 'info',
    });

    return NextResponse.json({ success: true });
  });
}
