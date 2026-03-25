import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';
import { Resend } from 'resend';

// ─── Lazy VAPID setup ─────────────────────────────────────────────────────────
function ensureVapid() {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL ?? 'noreply@snapcover.app'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
}

// ─── Lazy Resend client ────────────────────────────────────────────────────────
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM_EMAIL = 'SnapCover <noreply@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://snapcover-app.vercel.app';

// ─── GET /api/cron/check-expiry ───────────────────────────────────────────────
export async function GET(request: Request) {
  ensureVapid();

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = await createClient();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const { data: warranties } = await supabase
    .from('warranties')
    .select('*, push_subscriptions(*)')
    .neq('status', 'archived');

  if (!warranties) {
    return NextResponse.json({ message: 'No warranties found', processed: 0 });
  }

  const results: Array<{
    warranty_id: string;
    item_name: string;
    notification_days_before: number | null;
    channel: string | null;
    sent: boolean;
    error?: string;
  }> = [];

  for (const warranty of warranties as Record<string, unknown>[]) {
    const expiry = new Date(warranty.expiry_date as string);
    expiry.setHours(0, 0, 0, 0);
    const daysUntil = Math.round(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Mark as expired
    if (daysUntil < 0) {
      if (warranty.status !== 'expired') {
        await supabase
          .from('warranties')
          .update({ status: 'expired' })
          .eq('id', warranty.id);
      }
      continue;
    }

    // notification_days is an INTEGER[] — find which custom days match today
    const notificationDays = (warranty.notification_days as number[] | null) ?? [];
    const matchingDays = notificationDays.filter((d: number) => d === daysUntil);
    if (matchingDays.length === 0) continue;

    const subscriptions = (warranty.push_subscriptions ?? []) as Array<{
      endpoint: string;
      keys: { p256dh: string; auth: string };
    }>;

    for (const day of matchingDays) {
      const typeTag = day === 0 ? 'expired' : `expiry_${day}`;

      // Skip if already notified for this day
      const { data: existing } = await supabase
        .from('notifications')
        .select('id')
        .eq('warranty_id', warranty.id)
        .eq('type', typeTag)
        .single();

      if (existing) continue;

      let channel: string | null = null;
      let sent = false;
      let error: string | undefined;

      // Try push
      if (subscriptions.length > 0) {
        for (const sub of subscriptions) {
          try {
            await webpush.sendNotification(
              { endpoint: sub.endpoint, keys: sub.keys },
              JSON.stringify({
                title: 'SnapCover',
                body: getPushBody(warranty.item_name as string, day),
                icon: '/icon-192.png',
                tag: typeTag,
                data: { url: `${APP_URL}/app` },
              }),
            );
            sent = true;
            channel = 'push';
          } catch (err) {
            console.error('[push] failed for', sub.endpoint, err);
            error = String(err);
          }
        }
      }

      // Fall back to email
      if (!sent) {
        const { data: { user } } = await supabase.auth.admin.getUserById(
          warranty.user_id as string,
        );
        const email = user?.email;
        if (email) {
          const emailSent = await sendEmail(email, warranty.item_name as string, day);
          if (emailSent) {
            sent = true;
            channel = 'email';
            error = undefined;
          }
        }
      }

      // Log notification
      if (sent) {
        await supabase.from('notifications').insert({
          user_id:     warranty.user_id,
          warranty_id: warranty.id,
          type:        typeTag,
          channel,
        });

        // Mark as expiring
        if (warranty.status === 'active') {
          await supabase
            .from('warranties')
            .update({ status: 'expiring' })
            .eq('id', warranty.id);
        }
      }

      results.push({
        warranty_id: warranty.id as string,
        item_name: warranty.item_name as string,
        notification_days_before: day,
        channel,
        sent,
        error,
      });
    }
  }

  return NextResponse.json({
    message: 'Cron completed',
    processed: results.filter((r) => r.sent).length,
    results,
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPushBody(itemName: string, days: number): string {
  if (days === 0) return `${itemName} warranty expires today`;
  if (days === 1) return `${itemName} warranty expires tomorrow`;
  return `${itemName} warranty expires in ${days} days`;
}

async function sendEmail(email: string, itemName: string, days: number): Promise<boolean> {
  const client = getResend();
  if (!client) {
    console.log(`[Email fallback] Would send "${getPushBody(itemName, days)}" to ${email}`);
    return false;
  }

  const { subject, preheader, message } = getEmailContent(itemName, days);

  try {
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      text: message,
      html: emailHtml(subject, preheader, message),
    });

    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[email] send error:', err);
    return false;
  }
}

function getEmailContent(itemName: string, days: number): {
  subject: string;
  preheader: string;
  message: string;
} {
  const base = `${itemName} warranty`;

  if (days === 0) {
    return {
      subject: `🚨 ${base} expires today`,
      preheader: 'Your warranty expires today',
      message: `Hi,\n\nYour ${itemName} warranty expires today. Open SnapCover immediately.\n\n— The SnapCover team`,
    };
  }
  if (days === 1) {
    return {
      subject: `🚨 ${base} expires tomorrow`,
      preheader: 'Last chance — warranty expires tomorrow',
      message: `Hi,\n\nYour ${itemName} warranty expires tomorrow. Open SnapCover immediately.\n\n— The SnapCover team`,
    };
  }
  if (days <= 7) {
    return {
      subject: `⚠️ ${base} expires in ${days} days`,
      preheader: 'Your warranty is expiring soon',
      message: `Hi,\n\nYour ${itemName} warranty expires in ${days} days. Open SnapCover to take action.\n\n— The SnapCover team`,
    };
  }
  return {
    subject: `📋 ${base} expires in ${days} days`,
    preheader: 'Warranty expiring',
    message: `Hi,\n\nYour ${itemName} warranty expires in ${days} days. Open SnapCover to review it.\n\n— The SnapCover team`,
  };
}

function emailHtml(subject: string, preheader: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:480px;background:white;border-radius:12px;overflow:hidden">
          <tr>
            <td style="padding:24px 24px 20px;border-bottom:1px solid #e5e5ea">
              <p style="margin:0;font-size:13px;font-weight:600;color:#1d1d1f">📋 SnapCover</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px">
              <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#1d1d1f;line-height:1.3">
                ${subject.replace(/^[📋⚠️🚨]\s*/, '')}
              </h1>
              <p style="margin:0 0 20px;font-size:14px;color:#6e6e73">${preheader}</p>
              <p style="margin:0 0 24px;font-size:16px;color:#1d1d1f;line-height:1.6;white-space:pre-line">${message}</p>
              <a href="${APP_URL}/app"
                 style="display:inline-block;padding:14px 24px;background:#007aff;color:white;font-size:16px;font-weight:600;text-decoration:none;border-radius:8px">
                Open SnapCover
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px;background:#f5f5f7">
              <p style="margin:0;font-size:12px;color:#aea9b2">
                You&apos;re receiving this because you have a warranty tracked in SnapCover.
                <br>To manage notifications, open SnapCover → Settings.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
