'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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

const ALL_CATEGORIES = ['Electronics', 'Appliances', 'Tools', 'Vehicles', 'Clothing', 'Home', 'Other'];

export function WarrantyList({ initialWarranties, userId }: Props) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const { openFabMenu } = useFabMenu();
  const [mounted, setMounted] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Mark as mounted to enable client-only date computations
  useEffect(() => { setMounted(true); }, []);

  // Always compute status from date for accurate filtering
  const withStatus = useMemo(() => {
    return initialWarranties.map((w) => {
      // Use DB status as fallback; client-only date computation happens after mount
      const computedStatus: Warranty['status'] =
        mounted ? (() => {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const expiry = new Date(w.expiry_date);
          expiry.setHours(0, 0, 0, 0);
          const diff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return diff < 0 ? 'expired' : diff <= 30 ? 'expiring' : 'active';
        })() : (w.status as Warranty['status']);
      return { ...w, _computedStatus: computedStatus };
    });
  }, [initialWarranties, mounted]);

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
        !activeCategory || w.category === activeCategory;
      const matchesStatus =
        activeFilter === 'all' ||
        (activeFilter === 'expired' && w._computedStatus === 'expired') ||
        (activeFilter === 'expiring' && w._computedStatus === 'expiring') ||
        (activeFilter === 'active' && w._computedStatus === 'active');
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [withStatus, searchQuery, activeCategory, activeFilter]);

  const activeCount = filtered.length;
  const filterActive = activeFilter !== 'all' || !!activeCategory;

  const noResults = filtered.length === 0 && initialWarranties.length > 0;

  return (
    <div className={styles.wrapper}>
      {/* Search + filter bar */}
      {initialWarranties.length > 0 && (
        <div className={styles.searchRow}>
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

          {/* Filter dropdown trigger */}
          <div className={styles.filterWrapper} ref={filterRef}>
            <button
              type="button"
              className={`${styles.filterBtn} ${filterActive ? styles.filterBtnActive : ''}`}
              onClick={() => setFilterOpen((o) => !o)}
              aria-expanded={filterOpen}
              aria-haspopup="menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              Filters
              {filterActive && <span className={styles.filterBadge} />}
            </button>

            {filterOpen && (
              <div className={styles.filterMenu} role="menu">
                <div className={styles.filterSection}>
                  <p className={styles.filterSectionTitle}>Status</p>
                  {(['all', 'active', 'expiring', 'expired'] as FilterTab[]).map((tab) => {
                    const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                    const count = tab === 'all'
                      ? withStatus.length
                      : withStatus.filter((w) => w._computedStatus === tab).length;
                    return (
                      <button
                        key={tab}
                        type="button"
                        className={`${styles.filterOption} ${activeFilter === tab && !activeCategory ? styles.filterOptionActive : ''}`}
                        onClick={() => { setActiveFilter(tab); setActiveCategory(null); }}
                        role="menuitemcheckbox"
                        aria-checked={activeFilter === tab && !activeCategory}
                      >
                        <span className={styles.filterOptionLabel}>{label}</span>
                        <span className={styles.filterOptionCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.filterDivider} />

                <div className={styles.filterSection}>
                  <p className={styles.filterSectionTitle}>Category</p>
                  <button
                    type="button"
                    className={`${styles.filterOption} ${!activeCategory ? styles.filterOptionActive : ''}`}
                    onClick={() => { setActiveCategory(null); setActiveFilter('all'); }}
                    role="menuitemcheckbox"
                    aria-checked={!activeCategory}
                  >
                    <span className={styles.filterOptionLabel}>All</span>
                    <span className={styles.filterOptionCount}>{initialWarranties.length}</span>
                  </button>
                  {ALL_CATEGORIES.map((cat) => {
                    const count = initialWarranties.filter((w) => w.category === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        className={`${styles.filterOption} ${activeCategory === cat ? styles.filterOptionActive : ''}`}
                        onClick={() => { setActiveCategory(cat); setActiveFilter('all'); }}
                        role="menuitemcheckbox"
                        aria-checked={activeCategory === cat}
                      >
                        <span className={styles.filterOptionLabel}>{cat}</span>
                        <span className={styles.filterOptionCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {(activeFilter !== 'all' || !!activeCategory) && (
                  <>
                    <div className={styles.filterDivider} />
                    <button
                      type="button"
                      className={styles.filterClear}
                      onClick={() => { setActiveFilter('all'); setActiveCategory(null); setFilterOpen(false); }}
                    >
                      Clear all filters
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active filter summary */}
      {filterActive && (
        <div className={styles.activeFilters}>
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
          <span className={styles.activeFilterCount}>{activeCount} warranty{activeCount !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* No results */}
      {noResults && (
        <p className={styles.noResults}>
          No warranties match &ldquo;{searchQuery}&rdquo;
        </p>
      )}

      {/* Empty state */}
      {filtered.length === 0 && initialWarranties.length === 0 ? (
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
