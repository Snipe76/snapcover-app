'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function exchangeCode() {
      // Clear any stale auth cookies from previous auth flows
      document.cookie = 'sb-access-token=; path=/; max-age=0';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0';

      const supabase = createClient();

      // getSession auto-exchanges the PKCE token from the URL hash/params
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[callback] Auth error:', error.message, error.code);
        setErrorMessage(error.message);
        setStatus('error');
        setTimeout(() => {
          window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
        }, 2000);
        return;
      }

      if (session) {
        console.log('[callback] Session obtained, user:', session.user.id);
        setStatus('success');
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        // No session yet — try refreshing
        const { data: { user }, error: refreshError } = await supabase.auth.getUser();
        if (refreshError || !user) {
          console.error('[callback] No session after refresh:', refreshError);
          setErrorMessage(refreshError?.message ?? 'No session returned');
          setStatus('error');
          setTimeout(() => {
            window.location.href = '/login?error=session_not_created';
          }, 2000);
        }
      }
    }

    exchangeCode();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      fontFamily: '-apple-system, system-ui, sans-serif',
      background: '#f5f5f7',
      gap: '16px',
    }}>
      {status === 'loading' && (
        <>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #d2d2d7',
            borderTopColor: '#007aff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#6e6e73', fontSize: 15, margin: 0 }}>Signing in…</p>
        </>
      )}
      {status === 'error' && (
        <p style={{ color: '#ff3b30', fontSize: 15, margin: 0, textAlign: 'center', maxWidth: 280, padding: '0 24px' }}>
          Sign-in failed: {errorMessage}
        </p>
      )}
      {status === 'success' && (
        <p style={{ color: '#34c759', fontSize: 15, margin: 0 }}>Signed in! Redirecting…</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
