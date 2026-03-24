import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import type { Warranty } from '@/lib/db/types';
import { ExpiryBadge } from '@/components/features/ExpiryBadge';
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.itemName}>{w.item_name}</h1>
        <p className={styles.storeName}>{w.store_name}</p>
        <div className={styles.badge}>
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
          {w.notes && (
            <div className={styles.detailRow}>
              <dt>Notes</dt>
              <dd>{w.notes}</dd>
            </div>
          )}
        </dl>
      </section>

      {w.receipt_url && (
        <section className={styles.section} aria-labelledby="receipt-heading">
          <h2 id="receipt-heading" className={styles.sectionTitle}>Receipt</h2>
          <a
            href={w.receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.receiptLink}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            View receipt
          </a>
        </section>
      )}
    </div>
  );
}
