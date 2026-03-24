'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getExistingSubscription, subscribeToPush, unsubscribeFromPush } from '@/lib/notifications';
import styles from './SettingsClient.module.css';

interface SettingsClientProps {
  userId: string;
}

export function SettingsClient({ userId }: SettingsClientProps) {
  const router = useRouter();
  const supabase = createClient();

  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSupported] = useState(
    typeof window !== 'undefined' && 'Notification' in window,
  );

  // Check existing subscription on mount
  useEffect(() => {
    if (!pushSupported) return;
    getExistingSubscription().then((sub) => {
      setPushEnabled(!!sub);
    });
  }, [pushSupported]);

  const handlePushToggle = async () => {
    setPushLoading(true);
    try {
      if (pushEnabled) {
        const sub = await getExistingSubscription();
        if (sub) {
          await unsubscribeFromPush(sub);
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setPushLoading(false);
          return;
        }
        await navigator.serviceWorker.register('/sw.js');
        const sub = await subscribeToPush();
        if (sub) {
          const res = await fetch('/api/notifications/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscription: sub.toJSON() }),
          });
          if (res.ok) {
            setPushEnabled(true);
          }
        }
      }
    } catch (err) {
      console.error('[push] toggle error:', err);
    } finally {
      setPushLoading(false);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
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
    } finally {
      setExporting(false);
    }
  };

  // ─── Logout ─────────────────────────────────────────────────────────────
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ─── Delete Account ───────────────────────────────────────────────────────
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    // Delete all user data
    await supabase.from('warranties').delete().eq('user_id', userId);
    await supabase.from('notifications').delete().eq('user_id', userId);
    await supabase.from('push_subscriptions').delete().eq('user_id', userId);
    // Note: Deleting the auth user requires admin privileges
    await supabase.auth.signOut();
    router.push('/login?deleted=1');
  };

  return (
    <>
      {/* Push Notifications */}
      <section className={styles.section} aria-labelledby="push-heading">
        <h3 id="push-heading" className={styles.sectionTitle}>Push Notifications</h3>
        <div className={styles.card}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleLabelGroup}>
              <span className={styles.rowLabel}>
                {pushSupported ? 'Enable push notifications' : 'Not supported in this browser'}
              </span>
              {pushEnabled && (
                <span className={styles.activeBadge}>Active</span>
              )}
            </div>
            <button
              role="switch"
              aria-checked={pushEnabled}
              aria-label="Push notifications"
              className={`${styles.toggle} ${pushEnabled ? styles.toggleOn : ''}`}
              onClick={handlePushToggle}
              disabled={pushLoading || !pushSupported}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>

          <div className={styles.hint}>
            {pushEnabled
              ? 'You&apos;ll receive reminders 30, 7, and 1 day before a warranty expires.'
              : 'Enable to receive browser push notifications. Email reminders are always sent.'}
          </div>
        </div>
      </section>

      {/* Data */}
      <section className={styles.section} aria-labelledby="data-heading">
        <h3 id="data-heading" className={styles.sectionTitle}>Data</h3>
        <div className={styles.card}>
          <button
            className={styles.actionRow}
            onClick={handleExport}
            disabled={exporting}
          >
            <span className={styles.rowLabel}>
              {exporting ? 'Exporting…' : 'Export all warranties'}
            </span>
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
        <p className={styles.hint}>
          Permanently deletes all your warranties and data. This cannot be undone.
        </p>
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
