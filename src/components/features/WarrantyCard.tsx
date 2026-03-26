'use client';

import Link from 'next/link';
import { ExpiryBadge } from './ExpiryBadge';
import { Dialog } from '@/components/ui/Dialog';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Warranty, WarrantyStatus } from '@/lib/db/types';
import styles from './WarrantyCard.module.css';

interface Props {
  warranty: Warranty;
  onDelete?: (id: string) => void;
}

export function WarrantyCard({ warranty, onDelete }: Props) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const isReceipt = (warranty.type ?? 'warranty') === 'receipt';

  // Use computed status from WarrantyList (passed via _computedStatus) or fallback to DB status
  const effectiveStatus = (warranty as Warranty & { _computedStatus?: string })._computedStatus
    ?? (warranty.status ?? 'active');

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('warranties').delete().eq('id', warranty.id);
    onDelete?.(warranty.id);
    setShowDelete(false);
    setDeleting(false);
  };

  // Format price
  const priceDisplay = warranty.price_paid != null
    ? `$${Number(warranty.price_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  // Short date: "Mar 15"
  const shortDate = warranty.purchase_date
    ? new Date(warranty.purchase_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  // Status for accent bar color
  const accentClass = isReceipt
    ? styles.accentReceipt
    : effectiveStatus === 'expired'
    ? styles.accentExpired
    : effectiveStatus === 'expiring'
    ? styles.accentExpiring
    : '';

  const hasExpiry = !!warranty.expiry_date && warranty.expiry_date.trim() !== '';

  return (
    <>
      <Link
        href={`/app/warranty/${warranty.id}`}
        className={styles.card}
        aria-label={`${warranty.item_name}${isReceipt ? ' receipt' : ' warranty'}`}
      >
        {/* Left accent bar */}
        <span className={`${styles.accent} ${accentClass}`} aria-hidden="true" />

        {/* Content */}
        <div className={styles.content}>
          <div className={styles.topLine}>
            <span className={styles.itemName}>{warranty.item_name}</span>
            {!isReceipt && hasExpiry && (
              <span className={styles.typeIndicator}>W</span>
            )}
          </div>
          <div className={styles.bottomLine}>
            {warranty.store_name && (
              <span className={styles.storeName}>{warranty.store_name}</span>
            )}
            {warranty.store_name && shortDate && (
              <span className={styles.metaDot}>·</span>
            )}
            {shortDate && (
              <span className={styles.storeName}>{shortDate}</span>
            )}
            {priceDisplay && (
              <>
                <span className={styles.metaDot}>·</span>
                <span className={styles.price}>{priceDisplay}</span>
              </>
            )}
          </div>
        </div>

        {/* Right side: badge + delete */}
        <div className={styles.right}>
          {!isReceipt && hasExpiry ? (
            <ExpiryBadge expiryDate={warranty.expiry_date} status={effectiveStatus as WarrantyStatus} />
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
            aria-label={`Delete ${warranty.item_name}`}
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
          <strong>{warranty.item_name}</strong> will be permanently deleted.
          This cannot be undone.
        </p>
      </Dialog>
    </>
  );
}
