'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  getExistingSubscription,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/notifications';
import { logger, addBreadcrumb, logSupabaseError } from '@/lib/logger';
import styles from './settings.module.css';

interface Props {
  userId: string;
  email: string;
}

export function SettingsClient({ userId, email }: Props) {
  const router = useRouter();
  const supabase = createClient();

  // ─── Push notifications ───────────────────────────────────────────────────
  // Push is only supported in browsers with service workers + push manager
  const [pushSupported] = useState(
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
  const [pushEnabled, setPushEnabled]       = useState(false);
  const [pushLoading, setPushLoading]       = useState(false);
  const [pushError, setPushError]           = useState<string | null>(null);
  const [pushTesting, setPushTesting]       = useState(false);
  const [pushTestSent, setPushTestSent]     = useState(false);

  // Check existing subscription on mount
  useState(() => {
    if (typeof window !== 'undefined') {
      getExistingSubscription().then((sub) => setPushEnabled(!!sub));
    }
  });

  const handlePushToggle = async () => {
    setPushError(null);
    setPushLoading(true);

    addBreadcrumb('Settings', pushEnabled ? 'Disabling push' : 'Enabling push');

    try {
      if (pushEnabled) {
        const sub = await getExistingSubscription();
        if (sub) {
          await unsubscribeFromPush(sub);
          addBreadcrumb('Settings', 'Push unsubscribed');
        }
        setPushEnabled(false);
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          addBreadcrumb('Settings', 'Push permission denied');
          setPushError('Permission denied. Enable notifications in your browser settings.');
          setPushLoading(false);
          return;
        }

        let registration: ServiceWorkerRegistration | undefined;
        try {
          registration = await navigator.serviceWorker.register('/sw.js');
          addBreadcrumb('Settings', 'Service worker registered');
        } catch (swErr) {
          logger.error('Settings', 'Service worker registration failed', {
            error: swErr instanceof Error ? swErr.message : String(swErr),
          });
          setPushError('Service worker registration failed. Try refreshing the page.');
          setPushLoading(false);
          return;
        }

        let sub;
        try {
          sub = await subscribeToPush();
        } catch (subErr) {
          logger.error('Settings', 'Push subscription failed', {
            error: subErr instanceof Error ? subErr.message : String(subErr),
          });
          setPushError('Push subscription failed. Your browser may not support Web Push.');
          setPushLoading(false);
          return;
        }

        if (!sub) {
          setPushError('No subscription returned. Try refreshing and trying again.');
          setPushLoading(false);
          return;
        }

        const res = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          logger.error('Settings', 'Push subscribe API failed', {
            status: res.status,
            error: data.error,
          });
          setPushError(`Server error: ${data.error ?? res.status}`);
          setPushLoading(false);
          return;
        }

        addBreadcrumb('Settings', 'Push enabled successfully');
        setPushEnabled(true);
      }
    } catch (err) {
      logger.error('Settings', 'Push toggle error', {
        error: err instanceof Error ? err.message : String(err),
      });
      setPushError('Something went wrong. Please try again.');
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushTesting(true);
    setPushTestSent(false);
    setPushError(null);

    addBreadcrumb('Settings', 'Sending test push notification');

    try {
      const sub = await getExistingSubscription();
      if (!sub) {
        addBreadcrumb('Settings', 'No subscription found for test push');
        setPushError('No push subscription found. Enable push first.');
        setPushTesting(false);
        return;
      }
      const res = await fetch('/api/notifications/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (res.ok) {
        addBreadcrumb('Settings', 'Test push sent successfully');
        setPushTestSent(true);
      } else {
        const data = await res.json().catch(() => ({}));
        logger.error('Settings', 'Test push failed', {
          status: res.status,
          error: data.error,
        });
        setPushError(`Failed: ${data.error ?? res.status}`);
      }
    } catch (err) {
      logger.error('Settings', 'Test push error', {
        error: err instanceof Error ? err.message : String(err),
      });
      setPushError('Failed to send test notification.');
    } finally {
      setPushTesting(false);
    }
  };

  // ─── Export ─────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    addBreadcrumb('Settings', 'Exporting data');

    try {
      const { data, error } = await supabase
        .from('warranties')
        .select('*')
        .eq('user_id', userId);

      if (error) {
        logSupabaseError('select', 'warranties', error, { userId, action: 'export' });
        setExporting(false);
        return;
      }

      if (!data || data.length === 0) {
        addBreadcrumb('Settings', 'Export - no data to export');
        setExporting(false);
        return;
      }

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `snapcover-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      addBreadcrumb('Settings', 'Export completed', { count: data.length });
    } catch (err) {
      logger.error('Settings', 'Export failed', {
        error: err instanceof Error ? err.message : String(err),
      });
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
  const [deletingAccount, setDeletingAccount]     = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput]             = useState('');

  const handleDeleteAccount = async () => {
    if (deleteInput.trim() !== 'DELETE') return;

    addBreadcrumb('Settings', 'Deleting account', { userId });
    setDeletingAccount(true);

    try {
      // Delete in parallel
      const [warrantiesResult, notificationsResult, subscriptionsResult] = await Promise.all([
        supabase.from('warranties').delete().eq('user_id', userId),
        supabase.from('notifications').delete().eq('user_id', userId),
        supabase.from('push_subscriptions').delete().eq('user_id', userId),
      ]);

      if (warrantiesResult.error) {
        logSupabaseError('delete', 'warranties', warrantiesResult.error, { userId, action: 'deleteAccount' });
      }
      if (notificationsResult.error) {
        logSupabaseError('delete', 'notifications', notificationsResult.error, { userId, action: 'deleteAccount' });
      }
      if (subscriptionsResult.error) {
        logSupabaseError('delete', 'push_subscriptions', subscriptionsResult.error, { userId, action: 'deleteAccount' });
      }

      addBreadcrumb('Settings', 'Account data deleted, signing out');

      await supabase.auth.signOut();
      router.push('/login?deleted=1');
    } catch (err) {
      logger.error('Settings', 'Delete account failed', {
        error: err instanceof Error ? err.message : String(err),
        userId,
      });
      setDeletingAccount(false);
    }
  };

  return (
    <>
      {/* Account */}
      <section className={styles.section} aria-labelledby="account-heading">
        <h3 id="account-heading" className={styles.sectionTitle}>Account</h3>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{email}</span>
          </div>
        </div>
      </section>

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
              ? 'You\'ll receive reminders before warranties expire.'
              : 'Enable to receive browser push notifications. Email reminders are always sent.'}
          </div>

          {pushEnabled && (
            <button
              type="button"
              className={styles.sendTestBtn}
              onClick={handleSendTestPush}
              disabled={pushTesting}
            >
              {pushTesting ? 'Sending…' : pushTestSent ? '✓ Test sent!' : 'Send test notification'}
            </button>
          )}

          {pushError && (
            <div role="alert" style={{ color: 'var(--danger)', fontSize: '13px', marginTop: 'var(--space-2)' }}>
              {pushError}
            </div>
          )}
          {pushTestSent && !pushError && (
            <div style={{ color: 'var(--success, #34c759)', fontSize: '13px', marginTop: 'var(--space-2)' }}>
              Test notification sent! Check your browser.
            </div>
          )}
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
              {exporting ? 'Exporting…' : 'Export all items'}
            </span>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M8 2v8M4 7l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* Sign Out — above danger zone */}
      <button
        className={styles.logoutBtn}
        onClick={handleLogout}
        disabled={loggingOut}
      >
        {loggingOut ? 'Signing out…' : 'Sign out'}
      </button>

      {/* Danger Zone */}
      <section className={styles.section} aria-labelledby="danger-heading">
        <h3 id="danger-heading" className={styles.sectionTitle}>Danger zone</h3>
        <div className={`${styles.card} ${styles.cardDanger}`}>
          <button
            className={styles.actionRow}
            onClick={() => { setDeleteInput(''); setShowDeleteConfirm(true); }}
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

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className={styles.confirmCard}>
            <h4 id="delete-title" className={styles.confirmTitle}>Delete your account?</h4>
            <p className={styles.confirmBody}>
              All warranties, notifications, and settings will be permanently deleted.
              This cannot be undone.
            </p>
            <p className={styles.confirmBody} style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
              Type <strong>DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              autoComplete="off"
              autoFocus
              className={styles.deleteConfirmInput}
            />
            <div className={styles.confirmActions}>
              <button
                className={styles.confirmCancel}
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(''); }}
              >
                Cancel
              </button>
              <button
                className={styles.confirmDelete}
                onClick={handleDeleteAccount}
                disabled={deleteInput.trim() !== 'DELETE' || deletingAccount}
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
