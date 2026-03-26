'use client';

import Link from 'next/link';
import { ExpiryBadge } from './ExpiryBadge';
import { Dialog } from '@/components/ui/Dialog';
import { useState, Component, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Warranty, WarrantyStatus } from '@/lib/db/types';
import { logger, addBreadcrumb, logSupabaseError } from '@/lib/logger';
import styles from './WarrantyCard.module.css';

// ─── Types ─────────────────────────────────────────────────────────────────────

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

// ─── Card content component ─────────────────────────────────────────────────────

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
    addBreadcrumb('WarrantyCard', 'Delete confirmed by user', { warrantyId: w.id, itemName: w.item_name });

    try {
      const { error } = await supabase.from('warranties').delete().eq('id', w.id);
      if (error) {
        logSupabaseError('delete', 'warranties', error, { warrantyId: w.id });
        setShowDelete(false);
        setDeleting(false);
        return;
      }
      addBreadcrumb('WarrantyCard', 'Delete succeeded', { warrantyId: w.id });
      onDelete?.(w.id);
    } catch (err) {
      logger.error('WarrantyCard', 'Delete failed', {
        warrantyId: w.id,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setShowDelete(false);
      setDeleting(false);
    }
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

  const hasExpiry = !!(w.expiry_date && String(w.expiry_date ?? '').trim());

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
            <ExpiryBadge expiryDate={String(w.expiry_date ?? '')} status={effectiveStatus} />
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

// ─── Error Boundary ─────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
  errorStack: string;
}

interface WarrantyCardErrorBoundaryProps {
  children: ReactNode;
  warrantyId: string;
}

export class WarrantyCardErrorBoundary extends Component<WarrantyCardErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '', errorStack: '' };

  static getDerivedStateFromError(err: Error): ErrorBoundaryState {
    return { hasError: true, errorMessage: err.message, errorStack: err.stack ?? '' };
  }

  componentDidCatch(error: Error) {
    logger.error('WarrantyCard', `Card crashed: ${error.message}`, {
      warrantyId: this.props.warrantyId,
      stack: error.stack,
      errorName: error.name,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          style={{
            padding: '14px 16px',
            background: 'rgba(239,68,68,0.08)',
            border: '1.5px solid rgba(239,68,68,0.35)',
            borderRadius: '10px',
            marginBottom: '12px',
          }}
        >
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626', margin: '0 0 6px' }}>
            ⚠ Card crashed
          </p>
          <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '0 0 4px' }}>
            ID: <code>{this.props.warrantyId ?? 'unknown'}</code>
          </p>
          <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '0 0 6px', fontWeight: 600 }}>
            {this.state.errorMessage}
          </p>
          {this.state.errorStack && (
            <details>
              <summary style={{ fontSize: '11px', color: '#991b1b', cursor: 'pointer', fontWeight: 600, marginBottom: '4px' }}>
                Stack trace
              </summary>
              <pre style={{ fontSize: '10px', color: '#991b1b', overflow: 'auto', margin: 0, fontFamily: 'monospace' }}>
                {this.state.errorStack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export { WarrantyCardInner as WarrantyCard };
