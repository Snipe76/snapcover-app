'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

function LoginPageContent() {
  const searchParams = useSearchParams();
  const isSignupMode = searchParams.get('mode') === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>(isSignupMode ? 'signup' : 'signin');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    if (mode === 'signup') {
      if (password.length < 8) {
        setError('Password must be at least 8 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      if (!agreeToTerms) {
        setError('You must agree to the Terms of Service and Privacy Policy.');
        return;
      }
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        });

        setLoading(false);

        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccess('Check your email for a confirmation link. Click it, then come back and sign in with your password.');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        });

        setLoading(false);

        if (signInError) {
          setError(signInError.message);
        } else {
          router.push('/app');
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

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    setSuccess(null);
    setConfirmPassword('');
    setAgreeToTerms(false);
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
            onClick={() => handleModeSwitch('signin')}
          >
            Sign in
          </button>
          <button
            role="tab"
            aria-selected={mode === 'signup'}
            className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
            onClick={() => handleModeSwitch('signup')}
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
              minLength={8}
              className={styles.input}
            />
          </div>

          {mode === 'signup' && (
            <>
              <div className={styles.field}>
                <label htmlFor="confirmPassword" className={styles.label}>Confirm password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                  aria-required="true"
                  minLength={8}
                  className={styles.input}
                />
              </div>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className={styles.checkbox}
                  required
                  aria-required="true"
                />
                <span>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noopener noreferrer">Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
                </span>
              </label>
            </>
          )}

          {error && (
            <div role="alert" className={styles.error}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              loading ||
              !email.trim() ||
              !password.trim() ||
              (mode === 'signup' && (!confirmPassword.trim() || !agreeToTerms))
            }
            className={styles.button}
          >
            {loading
              ? mode === 'signup' ? 'Creating account…' : 'Signing in…'
              : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>
      </div>

      {mode === 'signin' && (
        <p className={styles.legal}>
          By continuing, you agree to our{' '}
          <a href="/terms">Terms of Service</a> and{' '}
          <a href="/privacy">Privacy Policy</a>.
        </p>
      )}
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
