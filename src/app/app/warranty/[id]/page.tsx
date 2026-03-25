import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Warranty } from '@/lib/db/types';
import { ExpiryBadge } from '@/components/features/ExpiryBadge';
import { ReceiptLightbox } from './ReceiptLightbox';
import { ReminderToggles } from './ReminderToggles';
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
  const isReceipt = (w.type ?? 'warranty') === 'receipt';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const purchaseDate = formatDate(w.purchase_date);
  const expiryDate   = formatDate(w.expiry_date);

  const warrantyLengthLabel =
    w.warranty_months > 0 && !isReceipt
      ? w.warranty_months < 12
        ? `${w.warranty_months} month${w.warranty_months !== 1 ? 's' : ''}`
        : `${w.warranty_months / 12} year${w.warranty_months !== 12 ? 's' : ''}`
      : null;

  const formatReminderTime = (time: string | null) => {
    if (!time) return 'Default (9:00 AM)';
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div className={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div className={styles.headerMeta}>
            {/* Type badge */}
            <span className={`${styles.typeBadge} ${isReceipt ? styles.typeReceipt : styles.typeWarranty}`}>
              {isReceipt ? 'Receipt' : 'Warranty'}
            </span>
            {/* Category */}
            {!isReceipt && w.category && w.category !== 'Other' && (
              <span className={styles.categoryBadge}>{w.category}</span>
            )}
          </div>
          {!isReceipt && <ExpiryBadge expiryDate={w.expiry_date ?? ''} status={w.status} />}
        </div>

        <h1 className={styles.itemName}>{w.item_name}</h1>
        {w.store_name && <p className={styles.storeName}>{w.store_name}</p>}
      </div>

      {/* ── Details ───────────────────────────────────────────────── */}
      <section className={styles.section} aria-labelledby="details-heading">
        <h2 id="details-heading" className={styles.sectionTitle}>Details</h2>
        <dl className={styles.detailsList}>
          {purchaseDate && (
            <div className={styles.detailRow}>
              <dt>Purchase date</dt>
              <dd>{purchaseDate}</dd>
            </div>
          )}

          {warrantyLengthLabel && (
            <div className={styles.detailRow}>
              <dt>Warranty length</dt>
              <dd>{warrantyLengthLabel}</dd>
            </div>
          )}

          {!isReceipt && expiryDate && (
            <div className={styles.detailRow}>
              <dt>Expires</dt>
              <dd>{expiryDate}</dd>
            </div>
          )}

          {w.reminder_time && !isReceipt && (
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

      {/* ── Reminders (warranties only) ──────────────────────────── */}
      {!isReceipt && (
        <section className={styles.section} aria-labelledby="notify-heading">
          <h2 id="notify-heading" className={styles.sectionTitle}>Reminders</h2>
          <ReminderToggles
            warrantyId={w.id}
            initialDays={w.notification_days ?? []}
            reminderTime={w.reminder_time ?? null}
          />
        </section>
      )}

      {/* ── Receipt image ─────────────────────────────────────────── */}
      {w.receipt_url && (
        <section className={styles.section} aria-labelledby="receipt-heading">
          <h2 id="receipt-heading" className={styles.sectionTitle}>Receipt</h2>
          <ReceiptLightbox src={w.receipt_url} alt={`Receipt for ${w.item_name}`} />
        </section>
      )}

      {/* ── Delete ───────────────────────────────────────────────── */}
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
              if (!confirm(`Delete this ${isReceipt ? 'receipt' : 'warranty'}? This cannot be undone.`)) {
                e.preventDefault();
              }
            }}
          >
            Delete {isReceipt ? 'receipt' : 'warranty'}
          </button>
        </form>
      </div>
    </div>
  );
}
