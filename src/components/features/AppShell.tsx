'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FabMenuContext } from '@/contexts/FabMenuContext';
import styles from './AppShell.module.css';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);

  // Close menu on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [menuOpen]);

  const openFabMenu = () => setMenuOpen(true);

  const handleAction = (source: string) => {
    setMenuOpen(false);
    if (source === 'camera') {
      cameraInputRef.current?.click();
    } else if (source === 'library') {
      libraryInputRef.current?.click();
    } else {
      router.push('/app/add?source=manual');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'library') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      sessionStorage.setItem('pending_warranty_image', dataUrl);
      router.push(`/app/add?source=${source}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <FabMenuContext.Provider value={{ openFabMenu }}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.headerTitle}>
            {getTitle(pathname)}
          </span>

          <Link
            href="/app/notifications"
            className={styles.headerAction}
            aria-label="Notifications"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>

      {/* Backdrop — closes menu on tap */}
      {menuOpen && (
        <div
          className={styles.backdrop}
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Hidden file inputs for camera + library */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileChange(e, 'camera')}
        className={styles.hiddenInput}
        aria-hidden="true"
        tabIndex={-1}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleFileChange(e, 'library')}
        className={styles.hiddenInput}
        aria-hidden="true"
        tabIndex={-1}
      />

      <nav className={styles.nav} aria-label="Main navigation">
        {/* Home */}
        <Link
          href="/app"
          className={`${styles.navItem} ${pathname === '/app' ? styles.navItemActive : ''}`}
          aria-current={pathname === '/app' ? 'page' : undefined}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Home</span>
        </Link>

        {/* FAB — Add */}
        <div className={styles.navItem} ref={menuRef}>
          <button
            className={styles.navFab}
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label="Add warranty"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>

          {menuOpen && (
            <div className={styles.addMenu} role="menu" aria-label="Add warranty options">
              <button
                className={styles.addMenuItem}
                onClick={() => handleAction('camera')}
                role="menuitem"
              >
                <span className={styles.addMenuIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.75" />
                  </svg>
                </span>
                Use camera
              </button>

              <button
                className={styles.addMenuItem}
                onClick={() => handleAction('library')}
                role="menuitem"
              >
                <span className={styles.addMenuIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke="currentColor" strokeWidth="1.75" />
                    <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.75" />
                    <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Import from library
              </button>

              <button
                className={styles.addMenuItem}
                onClick={() => handleAction('manual')}
                role="menuitem"
              >
                <span className={styles.addMenuIcon} aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                Enter manually
              </button>
            </div>
          )}
        </div>

        {/* Settings */}
        <Link
          href="/app/settings"
          className={`${styles.navItem} ${pathname === '/app/settings' ? styles.navItemActive : ''}`}
          aria-current={pathname === '/app/settings' ? 'page' : undefined}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Settings</span>
        </Link>
      </nav>
    </FabMenuContext.Provider>
  );
}

function getTitle(pathname: string): string {
  if (pathname.startsWith('/app/warranty/')) return 'Warranty';
  if (pathname === '/app/add') return 'Add Warranty';
  if (pathname === '/app/notifications') return 'Notifications';
  if (pathname === '/app/settings') return 'Settings';
  if (pathname === '/app') return 'SnapCover';
  return 'SnapCover';
}
