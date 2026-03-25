'use client';

import Link from 'next/link';
import { ExpiryBadge } from './ExpiryBadge';
import { Dialog } from '@/components/ui/Dialog';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Warranty } from '@/lib/db/types';
import styles from './WarrantyCard.module.css';

interface Props {
  warranty: Warranty;
  onDelete?: (id: string) => void;
}

export function WarrantyCard({ warranty, onDelete }: Props) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient();

  const handleDelete = async () => {
    setDeleting(true);
    await supabase.from('warranties').delete().eq('id', warranty.id);
    onDelete?.(warranty.id);
    setShowDelete(false);
    setDeleting(false);
  };

  return (
    <>
      <Link
        href={`/app/warranty/${warranty.id}`}
        className={`${styles.card} ${styles[`status_${warranty.status}`]}`}
        aria-label={`${warranty.item_name} from ${warranty.store_name}, ${getDaysText(warranty.expiry_date)}`}
      >
        <div className={styles.content}>
          <h3 className={styles.itemName}>{warranty.item_name}</h3>
          <p className={styles.storeName}>{warranty.store_name}</p>
        </div>

        <div className={styles.meta}>
          <ExpiryBadge expiryDate={warranty.expiry_date} status={warranty.status} />
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
      </Link>

      <Dialog
        isOpen={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete warranty?"
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

function getDaysText(expiryDate: string): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diff === 0)  return 'Expires today';
  if (diff === 1)  return 'Expires tomorrow';
  if (diff === -1) return 'Expired yesterday';
  if (diff > 0)    return `Expires in ${diff} days`;
  return `Expired ${Math.abs(diff)} days ago`;
}
