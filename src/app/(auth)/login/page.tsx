'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <rect width="48" height="48" rx="12" fill="var(--accent)" />
            <path d="M14 20h20M14 24h12M14 28h16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="36" cy="34" r="6" fill="var(--accent-secondary)" />
            <path d="M33.5 34l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className={styles.title}>SnapCover</h1>
        <p className={styles.subtitle}>Never lose a warranty again</p>
      </div>

      <div className={styles.card}>
        {sent ? (
          <div className={styles.success}>
            <div className={styles.successIcon} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="var(--accent-secondary)" opacity="0.15" />
                <circle cx="16" cy="16" r="14" stroke="var(--accent-secondary)" strokeWidth="2" />
                <path d="M10 16l4 4 8-8" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Check your email</h2>
            <p>
              We sent a magic link to <strong>{email}</strong>.<br />
              Click the link to sign in.
            </p>
          </div>
        ) : (
          <>
            <h2 className={styles.cardTitle}>Sign in</h2>
            <p className={styles.cardDescription}>
              Enter your email and we'll send you a magic link. No password needed.
            </p>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  autoFocus
                  required
                  aria-required="true"
                  className={styles.input}
                />
              </div>

              {error && (
                <div role="alert" className={styles.error}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className={styles.button}
              >
                {loading ? 'Sending…' : 'Send magic link'}
              </button>
            </form>
          </>
        )}
      </div>

      <p className={styles.legal}>
        By continuing, you agree to our{' '}
        <a href="/terms">Terms of Service</a> and{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}
