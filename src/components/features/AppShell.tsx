'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './AppShell.module.css';

interface AppShellProps {
  userId: string;
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <span className={styles.headerTitle}>
            {pathname === '/' ? 'My Warranties' : getTitle(pathname)}
          </span>
        </div>
      </header>

      <main id="main-content" className={styles.main} tabIndex={-1}>
        {children}
      </main>

      <nav className={styles.nav} aria-label="Main navigation">
        <Link
          href="/"
          className={`${styles.navItem} ${pathname === '/' ? styles.navItemActive : ''}`}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="9 22 9 12 15 12 15 22" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Home</span>
        </Link>

        <Link
          href="/add"
          className={`${styles.navItem} ${pathname === '/add' ? styles.navItemActive : ''}`}
          aria-current={pathname === '/add' ? 'page' : undefined}
        >
          <div className={styles.navFab} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <span>Add</span>
        </Link>

        <Link
          href="/notifications"
          className={`${styles.navItem} ${pathname === '/notifications' ? styles.navItemActive : ''}`}
          aria-current={pathname === '/notifications' ? 'page' : undefined}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span>Alerts</span>
        </Link>
      </nav>
    </>
  );
}

function getTitle(pathname: string): string {
  if (pathname.startsWith('/warranty/')) return 'Warranty';
  if (pathname === '/add') return 'Add Warranty';
  if (pathname === '/notifications') return 'Notifications';
  if (pathname === '/settings') return 'Settings';
  return 'SnapCover';
}
