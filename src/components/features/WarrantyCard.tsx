'use client';

import Link from 'next/link';
import { ExpiryBadge } from './ExpiryBadge';
import { Dialog } from '@/components/ui/Dialog';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Warranty, ItemType } from '@/lib/db/types';
import styles from './WarrantyCard.module.css';

interface Props {
  warranty: Warranty;
  onDelete?: (id: string) => void;
}

export function WarrantyCard({ warranty, onDelete }: Props) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();

  useEffect(() => { setMounted(true); }, []);

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

  // Format purchase date
  const purchaseDate = warranty.purchase_date
    ? new Date(warranty.purchase_date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  // Format price
  const priceDisplay = warranty.price_paid != null
    ? `$${Number(warranty.price_paid).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : null;

  // Receipt has no expiry_date, show "No expiry" or store receipt indicator
  const hasExpiry = !!warranty.expiry_date && warranty.expiry_date.trim() !== '';

  return (
    <>
      <Link
        href={`/app/warranty/${warranty.id}`}
        className={`${styles.card} ${!isReceipt ? styles[`status_${effectiveStatus}`] : ''}`}
        aria-label={`${warranty.item_name}${isReceipt ? ' receipt' : ' warranty'}`}
      >
        {/* Top row: type badge + category + delete */}
        <div className={styles.topRow}>
          <div className={styles.badges}>
            <span className={`${styles.typeBadge} ${isReceipt ? styles.typeReceipt : styles.typeWarranty}`}>
              {isReceipt ? 'Receipt' : 'Warranty'}
            </span>
            {warranty.category && warranty.category !== 'Other' && (
              <span className={styles.categoryBadge}>{warranty.category}</span>
            )}
          </div>
          <button
            className={styles.deleteBtn}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowDelete(true);
            }}
            aria-label={`Delete ${warranty.item_name}`}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M5.333 4V2.667a1 1 0 0 1 1-1h3.334a1 1 0 0 1 1 1V4m2 0v9.333a1 1 0 0 1-1 1H4.333a1 1 0 0 1-1-1V4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Item name */}
        <h3 className={styles.itemName}>{warranty.item_name}</h3>

        {/* Store name */}
        {warranty.store_name && (
          <p className={styles.storeName}>{warranty.store_name}</p>
        )}

        {/* Meta row: price + date */}
        <div className={styles.metaRow}>
          {priceDisplay && (
            <span className={styles.metaItem}>{priceDisplay}</span>
          )}
          {priceDisplay && purchaseDate && (
            <span className={styles.metaDot}>·</span>
          )}
          {purchaseDate && (
            <span className={styles.metaItem}>
              {isReceipt ? `Purchased ${purchaseDate}` : purchaseDate}
            </span>
          )}
        </div>

        {/* Bottom row: status/times-left */}
        <div className={styles.bottomRow}>
          {!isReceipt && hasExpiry ? (
            <ExpiryBadge expiryDate={warranty.expiry_date} status={warranty.status} />
          ) : isReceipt ? (
            <span className={styles.noExpiry}>Receipt on file</span>
          ) : null}
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
