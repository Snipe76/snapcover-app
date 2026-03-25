'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { WarrantyCard } from './WarrantyCard';
import { Skeleton } from '@/components/ui/Skeleton';
import { useFabMenu } from '@/contexts/FabMenuContext';
import type { Warranty } from '@/lib/db/types';
import styles from './WarrantyList.module.css';

interface Props {
  initialWarranties: Warranty[];
  userId: string;
}

type FilterTab = 'all' | 'active' | 'expiring' | 'expired';

type ComputedWarranty = Warranty & { _computedStatus: 'active' | 'expiring' | 'expired' };

const CATEGORIES = ['All', 'Electronics', 'Appliances', 'Tools', 'Vehicles', 'Clothing', 'Home', 'Other'];

export function WarrantyList({ initialWarranties, userId }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const { openFabMenu } = useFabMenu();

  // Always compute status from date for accurate filtering
  const withStatus = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return initialWarranties.map((w) => {
      const expiry = new Date(w.expiry_date);
      expiry.setHours(0, 0, 0, 0);
      const diff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const computedStatus: Warranty['status'] =
        diff < 0 ? 'expired' : diff <= 30 ? 'expiring' : 'active';
      return { ...w, _computedStatus: computedStatus };
    });
  }, [initialWarranties]);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return withStatus.filter((w) => {
      const matchesSearch =
        !q ||
        w.item_name.toLowerCase().includes(q) ||
        w.store_name?.toLowerCase().includes(q) ||
        w.notes?.toLowerCase().includes(q) ||
        w.serial_number?.toLowerCase().includes(q) ||
        w.order_number?.toLowerCase().includes(q);
      const matchesCategory =
        activeCategory === 'All' || w.category === activeCategory;
      const matchesStatus =
        activeFilter === 'all' ||
        (activeFilter === 'expired' && w._computedStatus === 'expired') ||
        (activeFilter === 'expiring' && w._computedStatus === 'expiring') ||
        (activeFilter === 'active' && w._computedStatus === 'active');
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [withStatus, searchQuery, activeCategory, activeFilter]);

  const empty = filtered.length === 0 && initialWarranties.length === 0;
  const noResults = filtered.length === 0 && initialWarranties.length > 0;

  return (
    <div className={styles.wrapper}>
      {/* Search bar */}
      {initialWarranties.length > 0 && (
        <div className={styles.searchBar}>
          <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75" />
            <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
          <input
            type="search"
            placeholder="Search warranties…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
            aria-label="Search warranties"
          />
          {searchQuery && (
            <button
              type="button"
              className={styles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Category pills — only show if there are warranties */}
      {initialWarranties.length > 0 && (
        <div className={styles.categoryScroll} role="group" aria-label="Filter by category">
          {CATEGORIES.map((cat) => {
            const count = cat === 'All'
              ? initialWarranties.length
              : initialWarranties.filter((w) => w.category === cat).length;
            if (count === 0 && cat !== 'All') return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`${styles.categoryPill} ${activeCategory === cat ? styles.categoryPillActive : ''}`}
                aria-pressed={activeCategory === cat}
              >
                {cat}
                {cat !== 'All' && <span className={styles.categoryCount}>{count}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter chips */}
      {initialWarranties.length > 0 && (
        <div className={styles.filters} role="group" aria-label="Filter by status">
          {(['all', 'active', 'expiring', 'expired'] as FilterTab[]).map((tab) => {
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const count = tab === 'all'
              ? filtered.length
              : withStatus.filter((w) => w._computedStatus === tab).length;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`${styles.filterChip} ${activeFilter === tab ? styles.filterChipActive : ''}`}
                aria-pressed={activeFilter === tab}
              >
                {label}
                <span className={styles.chipCount}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Result count */}
      {noResults && (
        <p className={styles.noResults}>
          No warranties match &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Empty state */}
      {empty ? (
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="color-mix(in srgb, var(--accent) 12%, transparent)" />
            <path d="M16 20h16M16 24h8M16 28h12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="36" cy="34" r="6" fill="var(--accent-secondary)" />
            <path d="M33.5 34l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className={styles.emptyTitle}>No warranties yet</p>
          <p className={styles.emptyText}>
            Tap <strong>+</strong> to add your first purchase and never lose track of a warranty again.
          </p>
          <button className={styles.emptyCta} onClick={openFabMenu}>
            Add your first warranty
          </button>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Warranties">
          {filtered.map((w) => (
            <li key={w.id}>
              <WarrantyCard warranty={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
