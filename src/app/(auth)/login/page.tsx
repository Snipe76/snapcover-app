'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        // Redirect handled by the (app)/layout auth check
        window.location.href = '/';
      }
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.hero}>
        <div className={styles.logo} aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
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
        {success ? (
          <div className={styles.success}>
            <div className={styles.successIcon} aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="14" fill="var(--accent-secondary)" opacity="0.15" />
                <circle cx="16" cy="16" r="14" stroke="var(--accent-secondary)" strokeWidth="2" />
                <path d="M10 16l4 4 8-8" stroke="var(--accent-secondary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2>Check your email</h2>
            <p>We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account and sign in.</p>
          </div>
        ) : (
          <>
            <div className={styles.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'signin'}
                className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`}
                onClick={() => { setMode('signin'); setError(null); }}
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === 'signup'}
                className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
                onClick={() => { setMode('signup'); setError(null); }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label htmlFor="email" className={styles.label}>Email address</label>
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

              <div className={styles.field}>
                <label htmlFor="password" className={styles.label}>
                  {mode === 'signup' ? 'Create password' : 'Password'}
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'signup' ? 'At least 8 characters' : ''}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  required
                  aria-required="true"
                  minLength={6}
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
                disabled={loading || !email.trim() || !password.trim()}
                className={styles.button}
              >
                {loading
                  ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
                  : mode === 'signup' ? 'Create account' : 'Sign in'}
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
