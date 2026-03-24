import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Vercel Cron job — runs daily.
 * Add to vercel.json:
 * {
 *   "crons": [{ "path": "/api/cron/check-expiry", "schedule": "0 8 * * *" }]
 * }
 *
 * Checks all active warranties and sends notifications for:
 * - 30 days before expiry
 * - 7 days before expiry
 * - 1 day before expiry
 * - On expiry day
 */
export async function GET(request: Request) {
  // Verify cron secret (prevents unauthorized runs)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  // Fetch all non-archived warranties with their push subscriptions
  const { data: warranties } = await supabase
    .from('warranties')
    .select('*, push_subscriptions(*)')
    .neq('status', 'archived');

  if (!warranties) {
    return NextResponse.json({ message: 'No warranties found', processed: 0 });
  }

  const results: { warrantyId: string; notificationType: string; sent: boolean }[] = [];

  for (const warranty of warranties) {
    const expiry = new Date(warranty.expiry_date);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let typeToSend: string | null = null;

    if (daysUntil === 30) typeToSend = 'expiry_30';
    else if (daysUntil === 7) typeToSend = 'expiry_7';
    else if (daysUntil === 1) typeToSend = 'expiry_1';
    else if (daysUntil === 0) typeToSend = 'expired';
    else if (daysUntil < 0) {
      // Update status to expired if not already
      if (warranty.status !== 'expired') {
        await supabase
          .from('warranties')
          .update({ status: 'expired' })
          .eq('id', warranty.id);
      }
      continue;
    }

    if (!typeToSend) continue;

    // Check if already notified for this type
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('warranty_id', warranty.id)
      .eq('type', typeToSend)
      .single();

    if (existing) continue; // already sent

    // Send push notifications
    const subscriptions = (warranty.push_subscriptions ?? []) as Array<{
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }>;

    for (const sub of subscriptions) {
      try {
        await sendPushNotification(sub, warranty.item_name, typeToSend);
      } catch (err) {
        console.error('Push failed:', err);
        // Fall back to email
        await sendEmailFallback(supabase, warranty.user_id, warranty.item_name, typeToSend);
      }
    }

    // Log notification
    await supabase.from('notifications').insert({
      user_id:     warranty.user_id,
      warranty_id: warranty.id,
      type:        typeToSend,
      channel:     subscriptions.length > 0 ? 'push' : 'email',
    });

    // Update warranty status
    if (typeToSend.startsWith('expiry') && warranty.status === 'active') {
      await supabase
        .from('warranties')
        .update({ status: 'expiring' })
        .eq('id', warranty.id);
    }

    results.push({ warrantyId: warranty.id, notificationType: typeToSend, sent: true });
  }

  return NextResponse.json({
    message: 'Cron completed',
    processed: results.length,
    results,
  });
}

async function sendPushNotification(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  itemName: string,
  type: string,
): Promise<void> {
  const body = getPushBody(itemName, type);
  const icon = '/icon-192.png';

  const payload = JSON.stringify({ title: 'SnapCover', body, icon, tag: type, data: { url: '/' } });

  const response = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'TTL': '86400',
      'Urgency': type === 'expired' ? 'high' : 'normal',
    },
    body: payload,
  });

  if (!response.ok) {
    throw new Error(`Push failed: ${response.status}`);
  }
}

function getPushBody(itemName: string, type: string): string {
  switch (type) {
    case 'expiry_30': return `${itemName} warranty expires in 30 days`;
    case 'expiry_7':  return `${itemName} warranty expires in 7 days`;
    case 'expiry_1':  return `${itemName} warranty expires tomorrow`;
    case 'expired':   return `${itemName} warranty has expired`;
    default:          return `Warranty update for ${itemName}`;
  }
}

async function sendEmailFallback(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  itemName: string,
  type: string,
): Promise<void> {
  const { data: { user } } = await supabase.auth.admin.getUserById(userId);
  const email = user?.email;
  if (!email) return;

  // Resend integration — fires and forgets in MVP
  // Full implementation: use Resend API
  console.log(`[Email fallback] Would send "${getPushBody(itemName, type)}" to ${email}`);
}
