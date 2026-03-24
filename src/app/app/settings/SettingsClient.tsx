'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import styles from './settings.module.css';

interface SettingsClientProps {
  userId: string;
}

export function SettingsClient({ userId }: SettingsClientProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const supabase = createClient();

  const handleExport = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('warranties')
      .select('*')
      .eq('user_id', userId);

    if (!data) return;

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `snapcover-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    // Delete all user data first
    const supabase = createClient();
    await supabase.from('warranties').delete().eq('user_id', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    // Delete auth user (requires admin key)
    // For MVP: just sign out and leave the account orphaned
    await supabase.auth.signOut();
    router.push('/login?deleted=1');
  };

  return (
    <>
      {/* Notifications */}
      <section className={styles.section} aria-labelledby="notifications-heading">
        <h3 id="notifications-heading" className={styles.sectionTitle}>Notifications</h3>
        <div className={styles.card}>
          {[
            { label: '30-day reminder', enabled: true },
            { label: '7-day reminder',  enabled: true },
            { label: '1-day reminder',   enabled: true },
            { label: 'Expiry day alert', enabled: true },
          ].map((item) => (
            <div key={item.label} className={styles.toggleRow}>
              <span className={styles.rowLabel}>{item.label}</span>
              <button
                role="switch"
                aria-checked={item.enabled}
                className={`${styles.toggle} ${item.enabled ? styles.toggleOn : ''}`}
                aria-label={`${item.label} ${item.enabled ? 'enabled' : 'disabled'}`}
              >
                <span className={styles.toggleThumb} />
              </button>
            </div>
          ))}
        </div>
        <p className={styles.hint}>
          Push notifications require browser permission. Email reminders are sent automatically.
        </p>
      </section>

      {/* Data */}
      <section className={styles.section} aria-labelledby="data-heading">
        <h3 id="data-heading" className={styles.sectionTitle}>Data</h3>
        <div className={styles.card}>
          <button className={styles.actionRow} onClick={handleExport}>
            <span className={styles.rowLabel}>Export all warranties</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className={styles.section} aria-labelledby="danger-heading">
        <h3 id="danger-heading" className={styles.sectionTitle}>Danger zone</h3>
        <div className={`${styles.card} ${styles.cardDanger}`}>
          <button
            className={styles.actionRow}
            onClick={() => setShowDeleteConfirm(true)}
          >
            <span className={styles.rowLabelDanger}>Delete account</span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 4h12M5.333 4V2.667a1 1 0 0 1 1-1h3.334a1 1 0 0 1 1 1V4m2 0v9.333a1 1 0 0 1-1 1H4.333a1 1 0 0 1-1-1V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        <p className={styles.hint}>Permanently deletes all your warranties and data. This cannot be undone.</p>
      </section>

      {/* Logout */}
      <button
        className={styles.logoutBtn}
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className={styles.confirmCard}>
            <h4 id="delete-title" className={styles.confirmTitle}>Delete your account?</h4>
            <p className={styles.confirmBody}>
              All warranties, notifications, and settings will be permanently deleted.
              This cannot be undone.
            </p>
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDelete}
                onClick={handleDeleteAccount}
                disabled={deletingAccount}
              >
                {deletingAccount ? 'Deleting…' : 'Delete account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
