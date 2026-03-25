'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { WarrantyCard } from './WarrantyCard';
import { useFabMenu } from '@/contexts/FabMenuContext';
import type { Warranty } from '@/lib/db/types';
import styles from './WarrantyList.module.css';

interface Props {
  initialWarranties: Warranty[];
  userId: string;
}

type FilterTab = 'all' | 'active' | 'expiring' | 'expired';
type SortOption = 'expiry_asc' | 'expiry_desc' | 'name_asc' | 'purchase_desc' | 'purchase_asc' | 'days_left';
type TypeFilter = 'all' | 'warranty' | 'receipt';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'expiry_asc',  label: 'Expiring soonest' },
  { value: 'expiry_desc', label: 'Expiring latest'  },
  { value: 'name_asc',    label: 'Name (A–Z)'        },
  { value: 'purchase_desc', label: 'Purchased newest' },
  { value: 'purchase_asc',  label: 'Purchased oldest' },
  { value: 'days_left',    label: 'Days remaining'    },
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
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef   = useRef<HTMLDivElement>(null);
  const { openFabMenu } = useFabMenu();
  const [mounted, setMounted] = useState(false);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setMounted(true); }, []);

  // Compute derived fields once
  const withStatus = useMemo(() => {
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
        case 'name_asc':       return a.item_name.localeCompare(b.item_name);
        case 'purchase_desc':  return b.purchase_date.localeCompare(a.purchase_date);
        case 'purchase_asc':   return a.purchase_date.localeCompare(b.purchase_date);
        case 'days_left': {
          const aDays = a._daysLeft ?? 99999;
          const bDays = b._daysLeft ?? 99999;
          return aDays - bDays;
        }
        case 'expiry_desc':
          return (b.expiry_date || '').localeCompare(a.expiry_date || '');
        case 'expiry_asc':
        default:
          // Put receipts at end when sorting by expiry
          if ((a.type ?? 'warranty') === 'receipt') return 1;
          if ((b.type ?? 'warranty') === 'receipt') return -1;
          return (a.expiry_date || '').localeCompare(b.expiry_date || '');
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
              placeholder="Search warranties & receipts…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
              aria-label="Search warranties and receipts"
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
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 6h18M6 12h12M9 18h6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
              </svg>
              {currentSortLabel}
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

          {/* Filter dropdown */}
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
              Filter
              {filterActive && <span className={styles.filterBadge} />}
            </button>

            {filterOpen && (
              <div className={styles.filterMenu} role="menu">
                {/* Type section */}
                <div className={styles.filterSection}>
                  <p className={styles.filterSectionTitle}>Type</p>
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
                        className={`${styles.filterOption} ${typeFilter === t && !activeCategory && activeFilter === 'all' ? styles.filterOptionActive : ''}`}
                        onClick={() => { setTypeFilter(t); setActiveFilter('all'); setActiveCategory(null); }}
                        role="menuitemcheckbox"
                        aria-checked={typeFilter === t && !activeCategory && activeFilter === 'all'}
                      >
                        <span className={styles.filterOptionLabel}>{label}</span>
                        <span className={styles.filterOptionCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.filterDivider} />

                {/* Status section */}
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
                        className={`${styles.filterOption} ${activeFilter === tab && !activeCategory && typeFilter === 'all' ? styles.filterOptionActive : ''}`}
                        onClick={() => { setActiveFilter(tab); setActiveCategory(null); setTypeFilter('all'); }}
                        role="menuitemcheckbox"
                        aria-checked={activeFilter === tab && !activeCategory && typeFilter === 'all'}
                      >
                        <span className={styles.filterOptionLabel}>{label}</span>
                        <span className={styles.filterOptionCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={styles.filterDivider} />

                {/* Category section */}
                <div className={styles.filterSection}>
                  <p className={styles.filterSectionTitle}>Category</p>
                  <button
                    type="button"
                    className={`${styles.filterOption} ${!activeCategory && typeFilter === 'all' && activeFilter === 'all' ? styles.filterOptionActive : ''}`}
                    onClick={() => { setActiveCategory(null); setTypeFilter('all'); setActiveFilter('all'); }}
                    role="menuitemcheckbox"
                    aria-checked={!activeCategory && typeFilter === 'all' && activeFilter === 'all'}
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
                        onClick={() => { setActiveCategory(cat); setTypeFilter('all'); setActiveFilter('all'); }}
                        role="menuitemcheckbox"
                        aria-checked={activeCategory === cat}
                      >
                        <span className={styles.filterOptionLabel}>{cat}</span>
                        <span className={styles.filterOptionCount}>{count}</span>
                      </button>
                    );
                  })}
                </div>

                {filterActive && (
                  <>
                    <div className={styles.filterDivider} />
                    <button
                      type="button"
                      className={styles.filterClear}
                      onClick={() => { setActiveFilter('all'); setActiveCategory(null); setTypeFilter('all'); setFilterOpen(false); }}
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
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="color-mix(in srgb, var(--accent) 12%, transparent)" />
            <path d="M16 20h16M16 24h8M16 28h12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
            <circle cx="36" cy="34" r="6" fill="var(--accent-secondary)" />
            <path d="M33.5 34l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className={styles.emptyTitle}>Nothing here yet</p>
          <p className={styles.emptyText}>
            SnapCover stores both <strong>warranties</strong> and <strong>receipts</strong>.&nbsp;
            Tap <strong>+</strong> to add your first item.
          </p>
          <button className={styles.emptyCta} onClick={openFabMenu}>
            Add your first item
          </button>
        </div>
      ) : (
        <ul className={styles.list} aria-label="Warranties and receipts">
          {sorted.map((w) => (
            <li key={w.id}>
              <WarrantyCard warranty={w} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
