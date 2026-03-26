'use client';

import Link from 'next/link';
import { ExpiryBadge } from './ExpiryBadge';
import { Dialog } from '@/components/ui/Dialog';
import { useState, Component, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Warranty, WarrantyStatus } from '@/lib/db/types';
import styles from './WarrantyCard.module.css';

interface Props {
  warranty: Warranty;
  onDelete?: (id: string) => void;
}

type WarrantyPlus = Warranty & {
  _computedStatus?: string;
  _daysLeft?: number | null;
};

function isValidStatus(s: string | undefined): s is WarrantyStatus {
  return s === 'active' || s === 'expiring' || s === 'expired' || s === 'archived';
}

function WarrantyCardInner({ warranty, onDelete }: Props) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const w = warranty as WarrantyPlus;
  const isReceipt = (w.type ?? 'warranty') === 'receipt';

  const rawStatus = w._computedStatus ?? (w.status ?? 'active');
  const effectiveStatus: WarrantyStatus = isValidStatus(rawStatus) ? rawStatus : 'active';

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('warranties').delete().eq('id', w.id);
    onDelete?.(w.id);
    setShowDelete(false);
    setDeleting(false);
  };

  const priceDisplay = w.price_paid != null
    ? `$${Number(w.price_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  const shortDate = w.purchase_date
    ? new Date(w.purchase_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const accentClass = isReceipt
    ? styles.accentReceipt
    : effectiveStatus === 'expired'
    ? styles.accentExpired
    : effectiveStatus === 'expiring'
    ? styles.accentExpiring
    : '';

  const hasExpiry = !!(w.expiry_date && w.expiry_date.trim());

  return (
    <>
      <Link
        href={`/app/warranty/${w.id}`}
        className={styles.card}
        aria-label={`${w.item_name}${isReceipt ? ' receipt' : ' warranty'}`}
      >
        <span className={`${styles.accent} ${accentClass}`} aria-hidden="true" />

        <div className={styles.content}>
          <div className={styles.topLine}>
            <span className={styles.itemName}>{w.item_name}</span>
          </div>
          <div className={styles.bottomLine}>
            {w.store_name && <span className={styles.storeName}>{w.store_name}</span>}
            {w.store_name && shortDate && <span className={styles.metaDot}>·</span>}
            {shortDate && <span className={styles.storeName}>{shortDate}</span>}
            {priceDisplay && (
              <>
                <span className={styles.metaDot}>·</span>
                <span className={styles.price}>{priceDisplay}</span>
              </>
            )}
          </div>
        </div>

        <div className={styles.right}>
          {!isReceipt && hasExpiry ? (
            <ExpiryBadge expiryDate={w.expiry_date ?? ''} status={effectiveStatus} />
          ) : isReceipt ? (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)', fontWeight: 600 }}>
              Receipt
            </span>
          ) : null}
          <button
            className={styles.deleteBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDelete(true);
            }}
            aria-label={`Delete ${w.item_name}`}
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M5.333 4V2.667a1 1 0 0 1 1-1h3.334a1 1 0 0 1 1 1V4m2 0v9.333a1 1 0 0 1-1 1H4.333a1 1 0 0 1-1-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </Link>

      <Dialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title={`Delete ${isReceipt ? 'receipt' : 'warranty'}?`}
        actions={[
          { label: 'Cancel', onClick: () => setShowDelete(false), variant: 'secondary' },
          { label: 'Delete', onClick: handleDelete, variant: 'destructive', loading: deleting },
        ]}
      >
        <p>
          <strong>{w.item_name}</strong> will be permanently deleted.
          This cannot be undone.
        </p>
      </Dialog>
    </>
  );
}

// Error boundary to prevent the whole list from crashing
export class WarrantyCardErrorBoundary extends Component<{ children: ReactNode }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return null; // Silently drop broken cards
    }
    return this.props.children;
  }
}

export { WarrantyCardInner as WarrantyCard };
