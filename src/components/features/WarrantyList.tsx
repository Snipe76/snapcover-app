'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { WarrantyCard, WarrantyCardErrorBoundary } from './WarrantyCard';
import { useFabMenu } from '@/contexts/FabMenuContext';
import type { Warranty } from '@/lib/db/types';
import { logger, addBreadcrumb, withPerformance } from '@/lib/logger';
import styles from './WarrantyList.module.css';
import filterStyles from './FilterSheet.module.css';

interface Props {
  initialWarranties: Warranty[];
  userId: string;
}

type FilterTab = 'all' | 'active' | 'expiring' | 'expired';
type SortOption = 'expiry_asc' | 'name_asc' | 'purchase_desc' | 'days_left';
type TypeFilter = 'all' | 'warranty' | 'receipt';

// Keep only distinct sort options — no near-duplicates
const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'expiry_asc',    label: 'Expiry (soonest first)' },
  { value: 'days_left',     label: 'Days remaining'         },
  { value: 'name_asc',      label: 'Name (A–Z)'             },
  { value: 'purchase_desc',  label: 'Purchase date (newest)' },
];

const ALL_CATEGORIES = ['Electronics', 'Appliances', 'Tools', 'Vehicles', 'Clothing', 'Home', 'Other'];

export function WarrantyList({ initialWarranties, userId }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filterOpen, setFilterOpen]     = useState(false);
  const [sortOpen, setSortOpen]         = useState(false);
  const [sortBy, setSortBy]             = useState<SortOption>('expiry_asc');
  const sortRef   = useRef<HTMLDivElement>(null);
  const { openFabMenu } = useFabMenu();
  const [mounted, setMounted] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // Debug: log when warranty list loads
  useEffect(() => {
    const endPerformance = withPerformance('WarrantyList', 'initialLoad');

    addBreadcrumb('WarrantyList', 'Mounted', {
      userId,
      warrantyCount: initialWarranties.length,
      warrantyTypes: [...new Set(initialWarranties.map(w => w.type ?? 'warranty'))],
      warrantyStatuses: [...new Set(initialWarranties.map(w => w.status))],
    });

    endPerformance({ warrantyCount: initialWarranties.length });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, initialWarranties.length]);

  // Compute derived fields once
  const withStatus = useMemo(() => {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.log('[WarrantyList] Processing', initialWarranties.length, 'warranties');
    }
    return initialWarranties.map((w) => {
      const isReceipt = (w.type ?? 'warranty') === 'receipt';
      const computedStatus: Warranty['status'] =
        mounted && !isReceipt ? (() => {
          if (!w.expiry_date || !w.expiry_date.trim()) return 'active';
          const now = new Date(); now.setHours(0, 0, 0, 0);
          const expiry = new Date(w.expiry_date); expiry.setHours(0, 0, 0, 0);
          const diff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diff < 0 ? 'expired' : diff <= 30 ? 'expiring' : 'active';
        })() : (w.status as Warranty['status']);

      const daysLeft = !isReceipt && w.expiry_date && w.expiry_date.trim()
        ? (() => {
            const now = new Date(); now.setHours(0, 0, 0, 0);
            const expiry = new Date(w.expiry_date); expiry.setHours(0, 0, 0, 0);
            return Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          })()
        : null;

      return { ...w, _computedStatus: computedStatus, _daysLeft: daysLeft };
    });
  }, [initialWarranties, mounted]);

  // Filter
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return withStatus.filter((w) => {
      const isReceipt = (w.type ?? 'warranty') === 'receipt';
      const matchesSearch =
        !q ||
        w.item_name.toLowerCase().includes(q) ||
        w.store_name?.toLowerCase().includes(q) ||
        w.notes?.toLowerCase().includes(q) ||
        w.serial_number?.toLowerCase().includes(q) ||
        w.order_number?.toLowerCase().includes(q);
      const matchesType =
        typeFilter === 'all' ||
        (typeFilter === 'receipt' && isReceipt) ||
        (typeFilter === 'warranty' && !isReceipt);
      const matchesCategory =
        !activeCategory || w.category === activeCategory;
      const matchesStatus =
        activeFilter === 'all' ||
        (activeFilter === 'expired'  && w._computedStatus === 'expired')  ||
        (activeFilter === 'expiring' && w._computedStatus === 'expiring') ||
        (activeFilter === 'active'  && w._computedStatus === 'active');
      return matchesSearch && matchesType && matchesCategory && matchesStatus;
    });
  }, [withStatus, searchQuery, activeCategory, activeFilter, typeFilter]);

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return a.item_name.localeCompare(b.item_name);
        case 'purchase_desc':
          return (b.purchase_date || '').localeCompare(a.purchase_date || '');
        case 'days_left': {
          const aDays = a._daysLeft ?? 99999;
          const bDays = b._daysLeft ?? 99999;
          return aDays - bDays;
        }
        case 'expiry_asc':
        default: {
          // Put receipts at end when sorting by expiry
          const aIsR = (a.type ?? 'warranty') === 'receipt';
          const bIsR = (b.type ?? 'warranty') === 'receipt';
          if (aIsR && !bIsR) return 1;
          if (!aIsR && bIsR) return -1;
          return (a.expiry_date || '').localeCompare(b.expiry_date || '');
        }
      }
    });
  }, [filtered, sortBy]);

  const activeCount  = sorted.length;
  const filterActive = activeFilter !== 'all' || !!activeCategory || typeFilter !== 'all';
  const hasItems    = initialWarranties.length > 0;
  const noResults   = sorted.length === 0 && hasItems;

  const currentSortLabel = SORT_OPTIONS.find(o => o.value === sortBy)?.label ?? 'Sort';

  return (
    <div className={styles.wrapper}>

      {/* ── Search + sort + filter bar ─────────────────────────────── */}
      {hasItems && (
        <div className={styles.searchRow}>
          <div className={styles.searchBar}>
            <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.75" />
              <path d="M21 21l-4.35-4.35" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            <input
              type="search"
              placeholder="Search items…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search items"
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

          {/* Sort dropdown */}
          <div className={styles.sortWrapper} ref={sortRef}>
            <button
              type="button"
              className={`${styles.sortBtn} ${sortBy !== 'expiry_asc' ? styles.sortBtnActive : ''}`}
              onClick={() => setSortOpen((o) => !o)}
              aria-expanded={sortOpen}
              aria-haspopup="menu"
              aria-label="Sort"
              title={currentSortLabel}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
            </button>
            {sortOpen && (
              <div className={styles.sortMenu} role="menu">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`${styles.sortOption} ${sortBy === opt.value ? styles.sortOptionActive : ''}`}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    role="menuitemradio"
                    aria-checked={sortBy === opt.value}
                  >
                    {sortBy === opt.value && (
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M3 8l3.5 3.5L13 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter button */}
          <button
            type="button"
            className={`${styles.filterBtn} ${filterActive ? styles.filterBtnActive : ''}`}
            onClick={() => setFilterOpen(true)}
            aria-expanded={filterOpen}
            aria-haspopup="dialog"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
            {filterActive
              ? `${(typeFilter !== 'all' ? 1 : 0) + (activeFilter !== 'all' ? 1 : 0) + (!!activeCategory ? 1 : 0)}`
              : 'Filter'}
          </button>
        </div>
      )}

      {/* ── Filter Bottom Sheet ─────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className={filterStyles.backdrop}
            onClick={() => setFilterOpen(false)}
            aria-hidden="true"
          />
          <div
            className={filterStyles.sheet}
            role="dialog"
            aria-modal="true"
            aria-label="Filter items"
          >
            <div className={filterStyles.handle} aria-hidden="true" />
            <div className={filterStyles.header}>
              <h2 className={filterStyles.title}>Filter</h2>
              {filterActive && (
                <button
                  type="button"
                  className={filterStyles.clearAll}
                  onClick={() => { setActiveFilter('all'); setActiveCategory(null); setTypeFilter('all'); }}
                >
                  Clear all
                </button>
              )}
            </div>

            <div className={filterStyles.content}>
              {/* Type */}
              <div className={filterStyles.section}>
                <p className={filterStyles.sectionTitle}>Type</p>
                <div className={filterStyles.chips}>
                  {(['all', 'warranty', 'receipt'] as TypeFilter[]).map((t) => {
                    const label = t === 'all' ? 'All' : t === 'warranty' ? 'Warranties' : 'Receipts';
                    const count = t === 'all'
                      ? withStatus.length
                      : t === 'receipt'
                      ? withStatus.filter(w => (w.type ?? 'warranty') === 'receipt').length
                      : withStatus.filter(w => (w.type ?? 'warranty') !== 'receipt').length;
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`${filterStyles.chip} ${typeFilter === t ? filterStyles.chipActive : ''}`}
                        onClick={() => setTypeFilter(t)}
                      >
                        {label}
                        <span className={filterStyles.chipCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status */}
              <div className={filterStyles.section}>
                <p className={filterStyles.sectionTitle}>Status</p>
                <div className={filterStyles.chips}>
                  {(['all', 'active', 'expiring', 'expired'] as FilterTab[]).map((tab) => {
                    const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                    const count = tab === 'all'
                      ? withStatus.length
                      : withStatus.filter((w) => w._computedStatus === tab).length;
                    return (
                      <button
                        key={tab}
                        type="button"
                        className={`${filterStyles.chip} ${activeFilter === tab ? filterStyles.chipActive : ''}`}
                        onClick={() => setActiveFilter(tab)}
                      >
                        {label}
                        <span className={filterStyles.chipCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Category */}
              <div className={filterStyles.section}>
                <p className={filterStyles.sectionTitle}>Category</p>
                <div className={filterStyles.chips}>
                  <button
                    type="button"
                    className={`${filterStyles.chip} ${!activeCategory ? filterStyles.chipActive : ''}`}
                    onClick={() => setActiveCategory(null)}
                  >
                    All
                    <span className={filterStyles.chipCount}>{initialWarranties.length}</span>
                  </button>
                  {ALL_CATEGORIES.map((cat) => {
                    const count = initialWarranties.filter((w) => w.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`${filterStyles.chip} ${activeCategory === cat ? filterStyles.chipActive : ''}`}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                        <span className={filterStyles.chipCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className={filterStyles.footer}>
              <button
                type="button"
                className={filterStyles.doneBtn}
                onClick={() => setFilterOpen(false)}
              >
                Done ({activeCount})
              </button>
            </div>
          </div>
        </>
      )}
      {/* ── Active filter chips ─────────────────────────────────────── */}
      {filterActive && (
        <div className={styles.activeFilters}>
          {typeFilter !== 'all' && (
            <span className={styles.activeFilterChip}>
              {typeFilter === 'receipt' ? 'Receipts' : 'Warranties'}
              <button type="button" onClick={() => setTypeFilter('all')} aria-label="Remove type filter">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          )}
          {activeFilter !== 'all' && (
            <span className={styles.activeFilterChip}>
              {activeFilter}
              <button type="button" onClick={() => setActiveFilter('all')} aria-label="Remove status filter">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          )}
          {activeCategory && (
            <span className={styles.activeFilterChip}>
              {activeCategory}
              <button type="button" onClick={() => setActiveCategory(null)} aria-label="Remove category filter">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </span>
          )}
          <span className={styles.activeFilterCount}>
            {activeCount} item{activeCount !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* ── No results ─────────────────────────────────────────────── */}
      {noResults && (
        <p className={styles.noResults}>
          No items match{searchQuery ? ` "${searchQuery}"` : ''}
        </p>
      )}

      {/* ── Empty state ───────────────────────────────────────────── */}
      {sorted.length === 0 && !hasItems ? (
        <div className={styles.empty}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
            <rect width="52" height="52" rx="14" fill="color-mix(in srgb, var(--accent-secondary, #34c759) 12%, transparent)" />
            <rect x="14" y="12" width="24" height="28" rx="3" stroke="var(--accent-secondary, #34c759)" strokeWidth="1.75" />
            <path d="M19 19h14M19 24h8M19 29h11" stroke="var(--accent-secondary, #34c759)" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="37" cy="37" r="8" fill="var(--accent)" />
            <path d="M34.5 37l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className={styles.emptyTitle}>No receipts yet</p>
          <p className={styles.emptyText}>
            Save your receipts to track purchases, prices, and warranty information — all in one place.
          </p>
          <button className={styles.emptyCta} onClick={openFabMenu}>
            Add your first receipt
          </button>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Warranties and receipts">
          {sorted.map((w) => (
            <li key={w.id}>
              <WarrantyCardErrorBoundary warrantyId={w.id}>
                <WarrantyCard warranty={w} />
              </WarrantyCardErrorBoundary>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
