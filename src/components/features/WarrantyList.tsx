'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { WarrantyCard } from './WarrantyCard';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Warranty } from '@/lib/db/types';
import styles from './WarrantyList.module.css';

type FilterTab = 'all' | 'active' | 'expiring' | 'expired';

interface Props {
  initialWarranties: Warranty[];
  userId: string;
}

export function WarrantyList({ initialWarranties, userId }: Props) {
  const [warranties, setWarranties] = useState<Warranty[]>(initialWarranties);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');

  const filtered = warranties.filter((w) => {
    if (activeFilter === 'all')     return w.status !== 'archived';
    if (activeFilter === 'active')  return w.status === 'active';
    if (activeFilter === 'expiring') return w.status === 'expiring';
    if (activeFilter === 'expired') return w.status === 'expired';
    return true;
  });

  const handleDelete = useCallback(async (id: string) => {
    // Optimistic update
    setWarranties((prev) => prev.filter((w) => w.id !== id));
  }, []);

  if (warranties.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyIcon} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect x="8" y="8" width="32" height="32" rx="8" stroke="var(--border)" strokeWidth="2" />
            <path d="M16 24h16M16 18h8" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h2 className={styles.emptyTitle}>No warranties yet</h2>
        <p className={styles.emptyText}>
          Tap <strong>+</strong> to add your first purchase and never lose track of a warranty again.
        </p>
        <Link href="/add" className={styles.emptyCta}>
          Add your first warranty
        </Link>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* Filter chips */}
      <div className={styles.filters} role="tablist" aria-label="Filter warranties">
        {(['all', 'active', 'expiring', 'expired'] as FilterTab[]).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeFilter === tab}
            className={`${styles.filterChip} ${activeFilter === tab ? styles.filterChipActive : ''}`}
            onClick={() => setActiveFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className={styles.count} aria-live="polite">
        {filtered.length} warranty{filtered.length !== 1 ? 'ies' : ''}
        {activeFilter !== 'all' ? ` · ${activeFilter}` : ''}
      </p>

      {/* List */}
      <ul className={styles.list} role="list">
        {filtered.map((warranty) => (
          <li key={warranty.id}>
            <WarrantyCard
              warranty={warranty}
              onDelete={handleDelete}
            />
          </li>
        ))}
      </ul>

      {filtered.length === 0 && warranties.length > 0 && (
        <div className={styles.emptyFilter}>
          <p>No {activeFilter} warranties.</p>
        </div>
      )}
    </div>
  );
}
