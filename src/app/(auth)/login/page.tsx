'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './login.module.css';

type Step = 'input' | 'otp' | 'magic';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('input');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const supabase = createClient();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    if (mode === 'signup') {
      // Check if user already exists
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.trim())
        .single();

      if (existing) {
        setError('An account with this email already exists. Try signing in.');
        setMode('signin');
        setLoading(false);
        return;
      }

      // Send magic link for confirmation
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/confirm`,
        },
      });

      setLoading(false);
      if (otpError) {
        setError(otpError.message);
      } else {
        setStep('magic');
      }
    } else {
      // Sign in: check if needs magic link
      setStep('magic');
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    setLoading(true);
    setError(null);

    const { error: magicError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/callback` },
    });

    setLoading(false);
    if (magicError) {
      setError(magicError.message);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (newOtp.every((d) => d !== '')) {
      handleOtpSubmit(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (code: string) => {
    setLoading(true);
    // Verify the OTP code
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      type: 'email',
      token: code,
    });

    setLoading(false);
    if (verifyError) {
      setError(verifyError.message);
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } else if (data.session) {
      window.location.href = '/';
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    setLoading(false);
    if (signInError) {
      setError(signInError.message);
    } else {
      window.location.href = '/';
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
        {/* Success state */}
        {success && !error && (
          <div className={styles.successBanner} role="status">
            <p>{success}</p>
          </div>
        )}

        {/* Step: Enter email */}
        {step === 'input' && (
          <>
            <div className={styles.tabs} role="tablist">
              <button
                role="tab"
                aria-selected={mode === 'signin'}
                className={`${styles.tab} ${mode === 'signin' ? styles.tabActive : ''}`}
                onClick={() => { setMode('signin'); setError(null); setSuccess(null); setStep('input'); }}
              >
                Sign in
              </button>
              <button
                role="tab"
                aria-selected={mode === 'signup'}
                className={`${styles.tab} ${mode === 'signup' ? styles.tabActive : ''}`}
                onClick={() => { setMode('signup'); setError(null); setSuccess(null); setStep('input'); }}
              >
                Create account
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className={styles.form} noValidate>
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

              {error && (
                <div role="alert" className={styles.error}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading || !email.trim()} className={styles.button}>
                {loading ? 'Sending…' : mode === 'signup' ? 'Continue with email' : 'Continue with email'}
              </button>
            </form>
          </>
        )}

        {/* Step: Magic link sent */}
        {step === 'magic' && (
          <div className={styles.magicStep}>
            <div className={styles.magicIcon} aria-hidden="true">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <rect x="4" y="8" width="32" height="24" rx="4" stroke="var(--accent)" strokeWidth="1.75" />
                <path d="M4 14l16 10 8-5" stroke="var(--accent)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className={styles.magicTitle}>Check your inbox</h2>
            <p className={styles.magicText}>
              We sent a <strong>magic link</strong> to<br />
              <strong>{email}</strong>
            </p>
            <p className={styles.magicHint}>
              Click the link in the email to {mode === 'signup' ? 'activate your account and sign in' : 'sign in'}.<br />
              Check your spam folder if you don't see it.
            </p>

            <button
              className={styles.resendBtn}
              onClick={handleMagicLink}
              disabled={loading}
            >
              {loading ? 'Sending…' : 'Resend magic link'}
            </button>

            <button
              className={styles.backBtn}
              onClick={() => { setStep('input'); setError(null); }}
            >
              ← Use a different email
            </button>
          </div>
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
