import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Warranty } from '@/lib/db/types';
import { ExpiryBadge } from '@/components/features/ExpiryBadge';
import { ReceiptLightbox } from './ReceiptLightbox';
import styles from './warranty.module.css';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function WarrantyDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: warranty } = await supabase
    .from('warranties')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!warranty) notFound();

  const w = warranty as Warranty;

  const purchaseDate = new Date(w.purchase_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const expiryDate = new Date(w.expiry_date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const warrantyLengthLabel =
    w.warranty_months < 12
      ? `${w.warranty_months} month${w.warranty_months !== 1 ? 's' : ''}`
      : `${w.warranty_months / 12} year${w.warranty_months !== 12 ? 's' : ''}`;

  const formatReminderTime = (time: string) => {
    if (!time) return 'Default (9:00 AM)';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <p className={styles.category}>{w.category ?? 'Other'}</p>
            <h1 className={styles.itemName}>{w.item_name}</h1>
            <p className={styles.storeName}>{w.store_name}</p>
          </div>
          <ExpiryBadge expiryDate={w.expiry_date} status={w.status} />
        </div>
      </div>

      <section className={styles.section} aria-labelledby="details-heading">
        <h2 id="details-heading" className={styles.sectionTitle}>Details</h2>
        <dl className={styles.detailsList}>
          <div className={styles.detailRow}>
            <dt>Purchase date</dt>
            <dd>{purchaseDate}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Warranty length</dt>
            <dd>{warrantyLengthLabel}</dd>
          </div>
          <div className={styles.detailRow}>
            <dt>Expires</dt>
            <dd>{expiryDate}</dd>
          </div>
          {w.reminder_time && (
            <div className={styles.detailRow}>
              <dt>Reminder time</dt>
              <dd>{formatReminderTime(w.reminder_time)}</dd>
            </div>
          )}
          {w.price_paid != null && (
            <div className={styles.detailRow}>
              <dt>Price paid</dt>
              <dd>${Number(w.price_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</dd>
            </div>
          )}
          {w.order_number && (
            <div className={styles.detailRow}>
              <dt>Order number</dt>
              <dd className={styles.mono}>{w.order_number}</dd>
            </div>
          )}
          {w.serial_number && (
            <div className={styles.detailRow}>
              <dt>Serial / model</dt>
              <dd className={styles.mono}>{w.serial_number}</dd>
            </div>
          )}
          {w.notes && (
            <div className={styles.detailRow}>
              <dt>Notes</dt>
              <dd>{w.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      {w.notification_days && Array.isArray(w.notification_days) && w.notification_days.length > 0 && (
        <section className={styles.section} aria-labelledby="notify-heading">
          <h2 id="notify-heading" className={styles.sectionTitle}>Reminders</h2>
          <div className={styles.reminderList}>
            {[...w.notification_days].sort((a, b) => b - a).map((days) => (
              <span key={days} className={styles.reminderChip}>
                {days === 0 ? 'Expiry day' : `${days} day${days !== 1 ? 's' : ''} before`}
              </span>
            ))}
          </div>
        </section>
      )}

      {w.receipt_url && (
        <section className={styles.section} aria-labelledby="receipt-heading">
          <h2 id="receipt-heading" className={styles.sectionTitle}>Receipt</h2>
          <ReceiptLightbox src={w.receipt_url} alt={`Receipt for ${w.item_name}`} />
        </section>
      )}

      <div className={styles.deleteSection}>
        <form
          action={async () => {
            'use server';
            const supabase = await createClient();
            await supabase.from('warranties').delete().eq('id', id);
            redirect('/app');
          }}
        >
          <button
            type="submit"
            className={styles.deleteBtn}
            onClick={(e) => {
              if (!confirm('Delete this warranty? This cannot be undone.')) {
                e.preventDefault();
              }
            }}
          >
            Delete warranty
          </button>
        </form>
      </div>
    </div>
  );
}
