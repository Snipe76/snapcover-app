import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import styles from './notifications.module.css';

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*, warranties(item_name)')
    .eq('user_id', user.id)
    .order('sent_at', { ascending: false })
    .limit(50);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Notifications</h2>

      {!notifications || notifications.length === 0 ? (
        <div className={styles.empty}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
            <path d="M20 4a6 6 0 0 0-6 6v4l-4 4v2h20v-2l-4-4V10a6 6 0 0 0-6-6z" stroke="var(--border)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M16 32a4 4 0 0 0 8 0" stroke="var(--border)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p>You&apos;re all caught up.</p>
          <p className={styles.emptySubtext}>No warranties expiring soon.</p>
        </div>
      ) : (
        <ul className={styles.list}>
          {notifications.map((n) => {
            const msg = getMessage(n.type, (n.warranties as { item_name: string } | null)?.item_name ?? 'Item');
            return (
              <li
                key={n.id}
                className={`${styles.item} ${n.read_at ? styles.itemRead : ''}`}
                aria-label={msg}
              >
                <div className={styles.itemIcon}>
                  {getNotificationIcon(n.type)}
                </div>
                <div className={styles.itemContent}>
                  <p className={styles.itemMessage}>{msg}</p>
                  <time className={styles.itemTime} dateTime={n.sent_at}>
                    {new Date(n.sent_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </time>
                </div>
                {!n.read_at && <div className={styles.unreadDot} aria-label="Unread" />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function getMessage(type: string, itemName: string): string {
  switch (type) {
    case 'expiry_30': return `${itemName} expires in 30 days`;
    case 'expiry_7':  return `${itemName} expires in 7 days`;
    case 'expiry_1':  return `${itemName} expires tomorrow`;
    case 'expired':   return `${itemName} has expired`;
    default:          return `${itemName} warranty update`;
  }
}

function getNotificationIcon(type: string) {
  const svgBase = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none' as const };
  if (type === 'expired') {
    return (
      <svg {...svgBase} aria-hidden="true">
        <circle cx="10" cy="10" r="8" stroke="var(--danger)" strokeWidth="1.5" />
        <path d="M10 6v4M10 13v2" stroke="var(--danger)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg {...svgBase} aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="var(--warning)" strokeWidth="1.5" />
      <path d="M10 6v5" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1" fill="var(--warning)" />
    </svg>
  );
}
