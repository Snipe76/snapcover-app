import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { subscription, action } = await request.json();

  if (!subscription?.endpoint) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
  }

  if (action === 'update') {
    // pushsubscriptionchange — update existing subscription
    const { endpoint, keys } = subscription;
    const { error } = await supabase
      .from('push_subscriptions')
      .update({ keys })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    return NextResponse.json({ success: !error, error: error?.message });
  }

  // New subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      user_id:  user.id,
      endpoint: subscription.endpoint,
      keys:     subscription.keys,
    }, {
      onConflict: 'user_id,endpoint',
    });

  if (error) {
    console.error('[subscribe] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
