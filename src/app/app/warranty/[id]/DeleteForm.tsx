'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { addBreadcrumb, logger } from '@/lib/logger';
import { useRouter } from 'next/navigation';
import styles from './warranty.module.css';

interface Props {
  warrantyId: string;
  itemName: string;
  isReceipt: boolean;
}

export function DeleteWarrantyForm({ warrantyId, itemName, isReceipt }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleDelete = async () => {
    if (!confirm(`Delete this ${isReceipt ? 'receipt' : 'warranty'}? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    addBreadcrumb('WarrantyDetail', 'Delete confirmed', { warrantyId, itemName });

    try {
      const { error } = await supabase.from('warranties').delete().eq('id', warrantyId);
      if (error) {
        logger.error('WarrantyDetail', 'Delete failed', { warrantyId, error: error.message });
        setDeleting(false);
        return;
      }
      addBreadcrumb('WarrantyDetail', 'Delete succeeded', { warrantyId });
      router.push('/app');
    } catch (err) {
      logger.error('WarrantyDetail', 'Delete error', {
        warrantyId,
        error: err instanceof Error ? err.message : String(err),
      });
      setDeleting(false);
    }
  };

  return (
    <div className={styles.deleteSection}>
      <button
        type="button"
        className={styles.deleteBtn}
        onClick={handleDelete}
        disabled={deleting}
      >
        {deleting ? 'Deleting…' : `Delete ${isReceipt ? 'receipt' : 'warranty'}`}
      </button>
    </div>
  );
}
