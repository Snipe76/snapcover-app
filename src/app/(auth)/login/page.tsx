'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    console.log('[login] Attempting', mode, 'for', email);

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        setLoading(false);
        console.log('[login] signUp result:', { hasData: !!data, hasError: !!signUpError, error: signUpError?.message, hasSession: !!data?.session });

        if (signUpError) {
          setError(signUpError.message);
        } else if (!data.session) {
          // Email confirmation required
          setSuccess('Check your email for a confirmation link. Click it, then come back and sign in with your password.');
        } else {
          router.push('/');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        setLoading(false);
        console.log('[login] signIn result:', { error: signInError?.message, code: signInError?.code });

        if (signInError) {
          setError(signInError.message);
        } else {
          console.log('[login] Sign in successful, redirecting to /');
          router.push('/');
        }
      }
    } catch (err) {
      console.error('[login] Unexpected error:', err);
      setLoading(false);
      setError('Something went wrong. Check the browser console for details.');
    }
  };

  const handleResendConfirmation = async () => {
    if (!email.trim()) return;
    setLoading(true);
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
    setLoading(false);
    if (resendError) {
      setError(resendError.message);
    } else {
      setSuccess('Confirmation email resent! Check your inbox (and spam).');
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
        {success && !error && (
          <div className={styles.successBanner} role="status">
            <p>{success}</p>
            {success.includes('Check your email') && (
              <button className={styles.resendBtn} onClick={handleResendConfirmation} disabled={loading}>
                {loading ? 'Sending…' : 'Resend confirmation email'}
              </button>
            )}
          </div>
        )}

        <div className={styles.tabs} role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'signin'}
            className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`}
            onClick={() => { setMode('signin'); setError(null); setSuccess(null); }}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === 'signup'}
            className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
            onClick={() => { setMode('signup'); setError(null); setSuccess(null); }}
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
              placeholder={mode === 'signup' ? 'At least 6 characters' : ''}
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
      </div>

      <p className={styles.legal}>
        By continuing, you agree to our{' '}
        <a href="/terms">Terms of Service</a> and{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </main>
  );
}
